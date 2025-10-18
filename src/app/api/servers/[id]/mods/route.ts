import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerMod, Mod } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import { z } from 'zod';

const AddModSchema = z.object({
  modId: z.number().int(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['serverMods', 'serverMods.mod'],
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ mods: server.serverMods });
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
    const body = await request.json();
    const validatedData = AddModSchema.parse(body);

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);
    const modRepository = db.getRepository(Mod);
    const serverModRepository = db.getRepository(ServerMod);

    const server = await serverRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['serverMods'],
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const mod = await modRepository.findOne({
      where: { id: validatedData.modId },
    });

    if (!mod) {
      return NextResponse.json(
        { error: 'Mod not found' },
        { status: 404 }
      );
    }

    // Check if mod loader is compatible
    if (server.modLoader !== mod.modLoader && mod.modLoader !== 'vanilla') {
      return NextResponse.json(
        { error: 'Mod loader is not compatible with this server' },
        { status: 400 }
      );
    }

    // Check if Minecraft version is compatible
    if (!mod.minecraftVersions.includes(server.minecraftVersion)) {
      return NextResponse.json(
        { error: 'Mod is not compatible with this Minecraft version' },
        { status: 400 }
      );
    }

    // Check if mod is already added
    const existing = await serverModRepository.findOne({
      where: {
        serverId: server.id,
        modId: mod.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Mod is already added to this server' },
        { status: 400 }
      );
    }

    // Add mod to server
    const serverMod = serverModRepository.create({
      serverId: server.id,
      modId: mod.id,
      enabled: true,
    });

    await serverModRepository.save(serverMod);

    // Sync mods folder
    const serverMods = await serverModRepository.find({
      where: { serverId: server.id, enabled: true },
      relations: ['mod'],
    });

    const modFiles = serverMods.map(sm => sm.mod.fileName);
    await dockerService.syncModsFolder(server.id, modFiles);

    return NextResponse.json({ serverMod }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding mod to server:', error);
    return NextResponse.json(
      { error: 'Failed to add mod to server' },
      { status: 500 }
    );
  }
}
