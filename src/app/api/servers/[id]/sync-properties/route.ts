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
    const updates: any = {};
    const errors: string[] = [];

    console.log(`Syncing server properties from RCON for server ${serverId}...`);

    // Check if container is running
    try {
      const { stdout: psOutput } = await execAsync(`docker ps -q -f name=${containerName}`);
      if (!psOutput.trim()) {
        return NextResponse.json(
          { error: 'Server is not running' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to check container status' },
        { status: 500 }
      );
    }

    // Get seed from RCON
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerName} rcon-cli "seed"`,
        { timeout: 10000 }
      );

      // Parse seed from output like "Seed: [-2964689583864898217]"
      const seedMatch = stdout.match(/Seed:\s*\[(-?\d+)\]/);
      if (seedMatch) {
        const actualSeed = seedMatch[1];
        updates.seed = actualSeed;
        console.log(`Found seed from RCON: ${actualSeed}`);
      } else {
        errors.push('Could not parse seed from RCON response');
      }
    } catch (error: any) {
      console.error('Error getting seed from RCON:', error);
      errors.push(`Failed to get seed: ${error.message}`);
    }

    // Get difficulty from RCON
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerName} rcon-cli "difficulty"`,
        { timeout: 10000 }
      );

      // Parse difficulty from output like "The difficulty is Easy" or "The difficulty is Normal"
      const difficultyMatch = stdout.match(/difficulty is (\w+)/i);
      if (difficultyMatch) {
        const difficulty = difficultyMatch[1].toLowerCase();
        if (!server.settings) {
          server.settings = {};
        }
        server.settings.difficulty = difficulty;
        console.log(`Found difficulty from RCON: ${difficulty}`);
      }
    } catch (error: any) {
      console.error('Error getting difficulty from RCON:', error);
      errors.push(`Failed to get difficulty: ${error.message}`);
    }

    // Get game rules
    try {
      const gameRules = ['keepInventory', 'doFireTick', 'mobGriefing', 'doDaylightCycle'];
      const settings = server.settings || {};

      for (const rule of gameRules) {
        try {
          const { stdout } = await execAsync(
            `docker exec ${containerName} rcon-cli "gamerule ${rule}"`,
            { timeout: 5000 }
          );

          // Parse output like "Gamerule keepInventory is currently set to: true"
          const match = stdout.match(/set to:\s*(true|false)/i);
          if (match) {
            settings[rule] = match[1].toLowerCase() === 'true';
          }
        } catch (error) {
          // Continue with other rules if one fails
          console.error(`Failed to get gamerule ${rule}`);
        }
      }

      if (Object.keys(settings).length > 0) {
        server.settings = settings;
      }
    } catch (error: any) {
      console.error('Error getting game rules from RCON:', error);
      errors.push(`Failed to get some game rules: ${error.message}`);
    }

    // Read server.properties file for additional info
    try {
      const { stdout: propsContent } = await execAsync(
        `docker exec ${containerName} cat /data/server.properties`,
        { timeout: 5000 }
      );

      const props = propsContent.split('\n');
      const settings = server.settings || {};

      // Parse key properties
      props.forEach(line => {
        const [key, value] = line.split('=').map(s => s.trim());

        switch (key) {
          case 'gamemode':
            settings.gamemode = value;
            break;
          case 'pvp':
            settings.pvp = value === 'true';
            break;
          case 'max-players':
            settings.maxPlayers = parseInt(value, 10);
            break;
          case 'view-distance':
            settings.viewDistance = parseInt(value, 10);
            break;
          case 'simulation-distance':
            settings.simulationDistance = parseInt(value, 10);
            break;
          case 'motd':
            settings.motd = value;
            break;
        }
      });

      server.settings = settings;
      console.log('Synced properties from server.properties file');
    } catch (error: any) {
      console.error('Error reading server.properties:', error);
      errors.push(`Failed to read server.properties: ${error.message}`);
    }

    // Update database
    if (updates.seed) {
      server.seed = updates.seed;
    }

    await serverRepository.save(server);

    console.log(`Server properties synced successfully for server ${serverId}`);

    return NextResponse.json({
      success: true,
      message: 'Server properties synced successfully',
      updates: {
        seed: updates.seed,
        currentSeed: server.seed,
        settings: server.settings,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error syncing server properties:', error);
    return NextResponse.json(
      { error: 'Failed to sync server properties', details: error.message },
      { status: 500 }
    );
  }
}
