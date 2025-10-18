import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ServerMod } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modVersionId: string }> }
) {
  try {
    const { id, modVersionId } = await params;
    const serverId = parseInt(id, 10);
    const modVersionIdNum = parseInt(modVersionId, 10);

    if (isNaN(serverId) || isNaN(modVersionIdNum)) {
      return NextResponse.json(
        { error: 'Invalid server ID or mod version ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled must be a boolean' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverModRepo = db.getRepository(ServerMod);

    const serverMod = await serverModRepo.findOne({
      where: { serverId, modVersionId: modVersionIdNum },
    });

    if (!serverMod) {
      return NextResponse.json(
        { error: 'Server mod not found' },
        { status: 404 }
      );
    }

    serverMod.enabled = enabled;
    await serverModRepo.save(serverMod);

    // Sync mod files to the server
    try {
      const allServerMods = await serverModRepo.find({
        where: { serverId, enabled: true },
        relations: ['modVersion', 'modVersion.project'],
      });

      const enabledModVersions = allServerMods.map(sm => sm.modVersion);
      await dockerService.syncModsForServer(serverId, enabledModVersions);
      console.log('Mods synced successfully after toggle');
    } catch (syncError) {
      console.error('Error syncing mods:', syncError);
      // Don't fail the request if sync fails, just log it
    }

    return NextResponse.json({
      success: true,
      serverMod,
    });
  } catch (error) {
    console.error('Error updating server mod:', error);
    return NextResponse.json(
      { error: 'Failed to update server mod' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modVersionId: string }> }
) {
  try {
    const { id, modVersionId } = await params;
    const serverId = parseInt(id, 10);
    const modVersionIdNum = parseInt(modVersionId, 10);

    if (isNaN(serverId) || isNaN(modVersionIdNum)) {
      return NextResponse.json(
        { error: 'Invalid server ID or mod version ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverModRepo = db.getRepository(ServerMod);

    const serverMod = await serverModRepo.findOne({
      where: { serverId, modVersionId: modVersionIdNum },
    });

    if (!serverMod) {
      return NextResponse.json(
        { error: 'Server mod not found' },
        { status: 404 }
      );
    }

    await serverModRepo.remove(serverMod);

    // Sync mod files to the server (remove deleted mod)
    try {
      const allServerMods = await serverModRepo.find({
        where: { serverId, enabled: true },
        relations: ['modVersion', 'modVersion.project'],
      });

      const enabledModVersions = allServerMods.map(sm => sm.modVersion);
      await dockerService.syncModsForServer(serverId, enabledModVersions);
      console.log('Mods synced successfully after deletion');
    } catch (syncError) {
      console.error('Error syncing mods:', syncError);
      // Don't fail the request if sync fails, just log it
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting server mod:', error);
    return NextResponse.json(
      { error: 'Failed to delete server mod' },
      { status: 500 }
    );
  }
}
