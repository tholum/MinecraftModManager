import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    const containerName = `minecraft-server-${serverId}`;
    const diagnostics: any = {
      serverId,
      containerName,
      tests: {},
    };

    // Test 1: Check if container is running
    try {
      const { stdout: psOutput } = await execAsync(`docker ps -q -f name=${containerName}`);
      diagnostics.tests.containerRunning = {
        success: !!psOutput.trim(),
        output: psOutput.trim() || 'Container not running',
      };
    } catch (error: any) {
      diagnostics.tests.containerRunning = {
        success: false,
        error: error.message,
      };
    }

    // Test 2: Check if mc-send-to-console command exists
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} which mc-send-to-console`,
        { timeout: 5000 }
      );
      diagnostics.tests.mcSendToConsoleExists = {
        success: true,
        path: stdout.trim(),
      };
    } catch (error: any) {
      diagnostics.tests.mcSendToConsoleExists = {
        success: false,
        error: error.message,
      };
    }

    // Test 3: Check if rcon-cli command exists
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} which rcon-cli`,
        { timeout: 5000 }
      );
      diagnostics.tests.rconCliExists = {
        success: true,
        path: stdout.trim(),
      };
    } catch (error: any) {
      diagnostics.tests.rconCliExists = {
        success: false,
        error: error.message,
      };
    }

    // Test 4: Check server.properties for RCON settings
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties | grep -E "rcon|enable-rcon"`,
        { timeout: 5000 }
      );
      diagnostics.tests.rconConfig = {
        success: true,
        config: stdout.trim().split('\n'),
      };
    } catch (error: any) {
      diagnostics.tests.rconConfig = {
        success: false,
        error: error.message,
      };
    }

    // Test 5: Check if console input pipe exists
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerName} ls -la /tmp/ | grep -i "console\\|minecraft"`,
        { timeout: 5000 }
      );
      diagnostics.tests.consolePipes = {
        success: true,
        pipes: stdout.trim().split('\n'),
      };
    } catch (error: any) {
      diagnostics.tests.consolePipes = {
        success: false,
        error: error.message,
      };
    }

    // Test 6: Try to execute a simple test command via mc-send-to-console
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} mc-send-to-console "list"`,
        { timeout: 5000 }
      );
      diagnostics.tests.mcSendToConsoleTest = {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error: any) {
      diagnostics.tests.mcSendToConsoleTest = {
        success: false,
        error: error.message,
        stderr: error.stderr,
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error('Error running diagnostics:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics', details: error.message },
      { status: 500 }
    );
  }
}
