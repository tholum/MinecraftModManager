import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerStatus } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';

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

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: serverId },
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    console.log(`Syncing mods for server ${server.name}...`);

    // Get all enabled mods
    const enabledMods = server.serverMods.filter(sm => sm.enabled);
    const enabledModVersions = enabledMods.map(sm => sm.modVersion);

    console.log(`Found ${enabledMods.length} enabled mods`);

    // Sync mods to server folder
    await dockerService.syncModsForServer(serverId, enabledModVersions);

    // Check if server is running
    const containerStatus = await dockerService.getContainerStatus(serverId);
    const isRunning = containerStatus === ServerStatus.RUNNING;

    let restarted = false;
    if (isRunning) {
      console.log('Server is running, restarting to apply changes...');
      try {
        await dockerService.restartContainer(serverId);
        restarted = true;
        console.log('Server restarted successfully');
      } catch (restartError) {
        console.error('Error restarting server:', restartError);
        return NextResponse.json(
          {
            success: false,
            error: 'Mods synced but failed to restart server',
            details: (restartError as Error).message
          },
          { status: 500 }
        );
      }
    } else {
      console.log('Server is not running, mods synced for next startup');
    }

    return NextResponse.json({
      success: true,
      syncedMods: enabledMods.length,
      restarted,
      message: isRunning
        ? `Synced ${enabledMods.length} mods and restarted server`
        : `Synced ${enabledMods.length} mods (server will load them on next start)`,
    });
  } catch (error: any) {
    console.error('Error syncing mods:', error);
    return NextResponse.json(
      { error: 'Failed to sync mods', details: error.message },
      { status: 500 }
    );
  }
}
