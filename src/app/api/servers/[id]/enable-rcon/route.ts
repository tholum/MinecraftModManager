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

    console.log(`Enabling RCON for server ${serverId}...`);

    // Step 1: Check current server.properties
    try {
      const { stdout: currentProps } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties`
      );

      const hasRconEnabled = currentProps.includes('enable-rcon=true');
      const hasRconPort = currentProps.includes('rcon.port=');
      const hasRconPassword = currentProps.includes('rcon.password=');

      console.log(`Current RCON status: enabled=${hasRconEnabled}, port=${hasRconPort}, password=${hasRconPassword}`);

      // Step 2: Update server.properties to enable RCON
      const commands = [];

      if (!hasRconEnabled) {
        commands.push(`sed -i 's/enable-rcon=false/enable-rcon=true/g' /data/server.properties`);
        commands.push(`grep -q '^enable-rcon=' /data/server.properties || echo 'enable-rcon=true' >> /data/server.properties`);
      }

      if (!hasRconPort) {
        commands.push(`grep -q '^rcon.port=' /data/server.properties || echo 'rcon.port=25575' >> /data/server.properties`);
      }

      if (!hasRconPassword) {
        commands.push(`grep -q '^rcon.password=' /data/server.properties || echo 'rcon.password=minecraft' >> /data/server.properties`);
      }

      if (commands.length > 0) {
        for (const cmd of commands) {
          await execAsync(`docker exec ${containerName} sh -c "${cmd}"`);
        }
        console.log('Updated server.properties with RCON settings');
      } else {
        console.log('RCON already configured in server.properties');
      }

      // Step 3: Verify the changes
      const { stdout: newProps } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties | grep -E "rcon|enable-rcon"`
      );

      return NextResponse.json({
        success: true,
        message: 'RCON has been configured. Note: Server must be restarted for changes to take effect.',
        needsRestart: !hasRconEnabled || !hasRconPort || !hasRconPassword,
        currentConfig: newProps.trim().split('\n'),
        warning: 'Players are currently online. RCON will only work after the next server restart.',
      });
    } catch (error: any) {
      console.error('Error enabling RCON:', error);
      return NextResponse.json(
        {
          error: 'Failed to enable RCON',
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in enable-rcon endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to enable RCON', details: error.message },
      { status: 500 }
    );
  }
}
