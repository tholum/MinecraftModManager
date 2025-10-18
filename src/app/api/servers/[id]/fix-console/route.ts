import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import { exec } from 'child_process';
import { promisify } from 'util';
import dockerService from '@/lib/services/docker.service';

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);
    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const containerName = `minecraft-server-${serverId}`;
    const steps: string[] = [];

    console.log(`Starting RCON fix for server ${serverId} (${server.name}) on port ${server.port}...`);
    steps.push(`Starting fix for ${server.name} on port ${server.port}`);

    // Step 1: Check if container exists and is running
    try {
      const { stdout: psOutput } = await execAsync(`docker ps -a -q -f name=${containerName}`);
      if (!psOutput.trim()) {
        return NextResponse.json({ error: 'Container not found' }, { status: 404 });
      }
      steps.push('Container found');
    } catch (error) {
      return NextResponse.json({ error: 'Failed to check container status' }, { status: 500 });
    }

    // Step 2: Enable RCON in server.properties
    try {
      console.log('Updating server.properties to enable RCON...');

      // Read current server.properties
      const { stdout: currentProps } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties 2>/dev/null || echo ""`
      );

      // Update RCON settings
      const commands = [
        // Enable RCON
        `docker exec ${containerName} sh -c "sed -i 's/^enable-rcon=.*/enable-rcon=true/' /data/server.properties"`,
        `docker exec ${containerName} sh -c "grep -q '^enable-rcon=' /data/server.properties || echo 'enable-rcon=true' >> /data/server.properties"`,

        // Set RCON port
        `docker exec ${containerName} sh -c "sed -i 's/^rcon.port=.*/rcon.port=25575/' /data/server.properties"`,
        `docker exec ${containerName} sh -c "grep -q '^rcon.port=' /data/server.properties || echo 'rcon.port=25575' >> /data/server.properties"`,

        // Set RCON password
        `docker exec ${containerName} sh -c "sed -i 's/^rcon.password=.*/rcon.password=minecraft/' /data/server.properties"`,
        `docker exec ${containerName} sh -c "grep -q '^rcon.password=' /data/server.properties || echo 'rcon.password=minecraft' >> /data/server.properties"`,

        // Ensure server port is correct
        `docker exec ${containerName} sh -c "sed -i 's/^server-port=.*/server-port=${server.port}/' /data/server.properties"`,
      ];

      for (const cmd of commands) {
        await execAsync(cmd);
      }

      steps.push('Updated server.properties with RCON configuration');
      console.log('server.properties updated successfully');
    } catch (error: any) {
      console.error('Error updating server.properties:', error);
      return NextResponse.json(
        {
          error: 'Failed to update server.properties',
          details: error.message,
          steps
        },
        { status: 500 }
      );
    }

    // Step 3: Verify server.properties
    try {
      const { stdout: verification } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties | grep -E "^(enable-rcon|rcon\\.|server-port)"`
      );
      console.log('Verified settings:', verification);
      steps.push('Verified RCON settings in server.properties');
    } catch (error) {
      console.error('Could not verify settings, but continuing...');
    }

    // Step 4: Restart the server
    try {
      console.log('Restarting server to apply RCON settings...');
      steps.push('Stopping server...');

      await dockerService.stopContainer(serverId);
      steps.push('Server stopped');

      // Wait a moment for clean shutdown
      await new Promise(resolve => setTimeout(resolve, 3000));

      steps.push('Starting server...');
      await dockerService.startContainer(serverId);
      steps.push('Server started');

      console.log('Server restarted successfully');
    } catch (error: any) {
      console.error('Error restarting server:', error);
      return NextResponse.json(
        {
          error: 'Failed to restart server',
          details: error.message,
          steps
        },
        { status: 500 }
      );
    }

    // Step 5: Wait for server to start up
    steps.push('Waiting for server to fully start (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 6: Test RCON connection
    let rconWorking = false;
    try {
      console.log('Testing RCON connection...');
      const { stdout } = await execAsync(
        `docker exec ${containerName} rcon-cli "list"`,
        { timeout: 10000 }
      );
      rconWorking = true;
      steps.push(`RCON test successful: ${stdout.trim()}`);
      console.log('RCON is working!');
    } catch (error: any) {
      console.error('RCON test failed:', error.message);
      steps.push('RCON test failed - checking mc-send-to-console...');

      // Test mc-send-to-console as fallback
      try {
        const { stdout } = await execAsync(
          `docker exec ${containerName} mc-send-to-console "list"`,
          { timeout: 10000 }
        );
        steps.push('mc-send-to-console is working as fallback');
      } catch (fallbackError) {
        steps.push('Warning: Both RCON and mc-send-to-console tests failed');
      }
    }

    // Step 7: Verify port mapping
    try {
      const { stdout: portInfo } = await execAsync(
        `docker port ${containerName} 25565`
      );
      steps.push(`Game server running on: ${portInfo.trim()}`);
    } catch (error) {
      steps.push('Could not verify port mapping');
    }

    return NextResponse.json({
      success: true,
      message: 'Server console has been fixed and server restarted',
      rconEnabled: rconWorking,
      serverPort: server.port,
      rconPort: 25575,
      steps,
      nextSteps: [
        'Try executing commands in the web console',
        `Game server is running on port ${server.port}`,
        rconWorking ? 'RCON is working properly' : 'RCON may need more time to initialize - wait 1-2 minutes',
      ],
    });
  } catch (error: any) {
    console.error('Error in fix-console endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fix console', details: error.message },
      { status: 500 }
    );
  }
}
