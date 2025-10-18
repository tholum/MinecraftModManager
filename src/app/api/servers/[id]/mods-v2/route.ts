import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ServerMod, ModVersion, ModProject, Server } from '@/lib/database/entities';
import modDependencyService from '@/lib/services/mod-dependency.service';

export async function GET(
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
    const serverModRepo = db.getRepository(ServerMod);

    const serverMods = await serverModRepo.find({
      where: { serverId },
      relations: ['modVersion', 'modVersion.project'],
      order: { id: 'ASC' },
    });

    return NextResponse.json({ mods: serverMods });
  } catch (error) {
    console.error('Error fetching server mods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server mods' },
      { status: 500 }
    );
  }
}

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
    const { modVersionId } = body;

    if (!modVersionId) {
      return NextResponse.json(
        { error: 'Mod version ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverModRepo = db.getRepository(ServerMod);
    const modVersionRepo = db.getRepository(ModVersion);

    // Verify the mod version exists
    const modVersion = await modVersionRepo.findOne({
      where: { id: modVersionId },
      relations: ['project'],
    });

    if (!modVersion) {
      return NextResponse.json(
        { error: 'Mod version not found' },
        { status: 404 }
      );
    }

    // Check if this mod version is already added to this server
    const existingServerMod = await serverModRepo.findOne({
      where: { serverId, modVersionId },
    });

    if (existingServerMod) {
      return NextResponse.json(
        { error: 'This mod version is already added to this server' },
        { status: 409 }
      );
    }

    // Get server info for dependency resolution
    const serverRepo = db.getRepository(Server);
    const server = await serverRepo.findOne({ where: { id: serverId } });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Create the server mod
    const serverMod = new ServerMod();
    serverMod.serverId = serverId;
    serverMod.modVersionId = modVersionId;
    serverMod.enabled = true;

    await serverModRepo.save(serverMod);

    // Resolve and install dependencies
    const dependencies = await modDependencyService.resolveDependencies(
      modVersionId,
      server.minecraftVersion,
      server.modLoader
    );

    const installedDeps = [];

    for (const [depModVersionId, depInfo] of dependencies.entries()) {
      // Check if already installed
      const existing = await serverModRepo.findOne({
        where: { serverId, modVersionId: depModVersionId },
      });

      if (!existing) {
        const depServerMod = new ServerMod();
        depServerMod.serverId = serverId;
        depServerMod.modVersionId = depModVersionId;
        depServerMod.enabled = true;

        await serverModRepo.save(depServerMod);
        installedDeps.push({
          modVersionId: depModVersionId,
          reason: depInfo.reason,
        });
      }
    }

    // Fetch the complete server mod with relations
    const completeServerMod = await serverModRepo.findOne({
      where: { id: serverMod.id },
      relations: ['modVersion', 'modVersion.project'],
    });

    return NextResponse.json({
      success: true,
      serverMod: completeServerMod,
      dependencies: installedDeps,
      dependencyCount: installedDeps.length,
    });
  } catch (error) {
    console.error('Error adding server mod:', error);
    return NextResponse.json(
      { error: 'Failed to add server mod' },
      { status: 500 }
    );
  }
}
