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

    // Execute the command using rcon-cli
    // The itzg/minecraft-server image includes rcon-cli
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} rcon-cli ${command.replace(/'/g, "'\\''")}`,
        { timeout: 10000 }
      );

      return NextResponse.json({
        success: true,
        command,
        output: stdout || stderr || 'Command executed',
      });
    } catch (error: any) {
      // If rcon-cli fails, try using mc-send-to-console as fallback
      try {
        const { stdout, stderr } = await execAsync(
          `docker exec ${containerName} mc-send-to-console ${command.replace(/'/g, "'\\''")}`,
          { timeout: 10000 }
        );

        return NextResponse.json({
          success: true,
          command,
          output: stdout || stderr || 'Command sent to console',
        });
      } catch (fallbackError: any) {
        return NextResponse.json(
          {
            error: 'Failed to execute command',
            details: fallbackError.message,
            originalError: error.message
          },
          { status: 500 }
        );
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
