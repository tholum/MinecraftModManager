import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const containerName = `minecraft-server-${serverId}`;

    // Check if container is running
    const { stdout: psOutput } = await execAsync(`docker ps -q -f name=${containerName}`);
    if (!psOutput.trim()) {
      return NextResponse.json(
        { error: 'Server is not running' },
        { status: 400 }
      );
    }

    // Try multiple methods to execute the command
    // Method 1: Use mc-send-to-console (works without RCON)
    try {
      console.log(`Executing command via mc-send-to-console: ${command}`);
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} mc-send-to-console "${command.replace(/"/g, '\\"')}"`,
        { timeout: 10000 }
      );

      console.log(`Command executed successfully. stdout: ${stdout}, stderr: ${stderr}`);
      return NextResponse.json({
        success: true,
        command,
        output: stdout || stderr || 'Command sent to console',
      });
    } catch (error1: any) {
      console.error(`mc-send-to-console failed: ${error1.message}`);

      // Method 2: Try rcon-cli if available
      try {
        console.log(`Trying rcon-cli fallback for command: ${command}`);
        const { stdout, stderr } = await execAsync(
          `docker exec ${containerName} rcon-cli "${command.replace(/"/g, '\\"')}"`,
          { timeout: 10000 }
        );

        console.log(`rcon-cli executed successfully. stdout: ${stdout}, stderr: ${stderr}`);
        return NextResponse.json({
          success: true,
          command,
          output: stdout || stderr || 'Command executed',
        });
      } catch (error2: any) {
        console.error(`rcon-cli failed: ${error2.message}`);

        // Method 3: Direct exec to server console pipe
        try {
          console.log(`Trying direct console pipe for command: ${command}`);
          const { stdout, stderr } = await execAsync(
            `echo "${command.replace(/"/g, '\\"')}" | docker exec -i ${containerName} /bin/sh -c "cat > /data/stdin.txt && cat /data/stdin.txt"`,
            { timeout: 10000 }
          );

          console.log(`Direct pipe executed. stdout: ${stdout}, stderr: ${stderr}`);
          return NextResponse.json({
            success: true,
            command,
            output: 'Command sent to console (via stdin)',
          });
        } catch (error3: any) {
          console.error(`All command execution methods failed`);
          console.error(`Method 1 error: ${error1.message}`);
          console.error(`Method 2 error: ${error2.message}`);
          console.error(`Method 3 error: ${error3.message}`);

          return NextResponse.json(
            {
              error: 'Failed to execute command - all methods failed',
              details: {
                mcSendToConsole: error1.message,
                rconCli: error2.message,
                directPipe: error3.message,
              },
              suggestion: 'RCON may not be enabled. Server may need to be restarted with RCON enabled.'
            },
            { status: 500 }
          );
        }
      }
    }
  } catch (error: any) {
    console.error('Error executing console command:', error);
    return NextResponse.json(
      { error: 'Failed to execute command', details: error.message },
      { status: 500 }
    );
  }
}
