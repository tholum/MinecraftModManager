import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerStatus, ModLoader } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import { z } from 'zod';

const CreateServerSchema = z.object({
  name: z.string().min(1).max(255),
  port: z.number().int().min(1024).max(65535),
  minecraftVersion: z.string(),
  modLoader: z.nativeEnum(ModLoader),
  modLoaderVersion: z.string().optional(),
  seed: z.string().optional(),
  settings: z.object({
    difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']).optional(),
    gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).optional(),
    maxPlayers: z.number().int().optional(),
    pvp: z.boolean().optional(),
    allowNether: z.boolean().optional(),
    allowFlight: z.boolean().optional(),
    spawnMonsters: z.boolean().optional(),
    spawnAnimals: z.boolean().optional(),
    spawnNpcs: z.boolean().optional(),
    viewDistance: z.number().int().optional(),
    simulationDistance: z.number().int().optional(),
    levelType: z.string().optional(),
    motd: z.string().optional(),
    onlineMode: z.boolean().optional(),
    whitelist: z.boolean().optional(),
    enableCommandBlock: z.boolean().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const servers = await serverRepository.find({
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
      order: { createdAt: 'DESC' },
    });

    // Update server statuses from Docker
    for (const server of servers) {
      const status = await dockerService.getContainerStatus(server.id);
      if (server.status !== status) {
        server.status = status;
        await serverRepository.save(server);
      }
    }

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateServerSchema.parse(body);

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    // Check if port is already in use
    const existingServer = await serverRepository.findOne({
      where: { port: validatedData.port },
    });

    if (existingServer) {
      return NextResponse.json(
        { error: 'Port is already in use' },
        { status: 400 }
      );
    }

    // Generate a random seed if none provided
    const seed = validatedData.seed || Math.floor(Math.random() * 2147483647).toString();

    // Create server entity
    const server = serverRepository.create({
      name: validatedData.name,
      port: validatedData.port,
      minecraftVersion: validatedData.minecraftVersion,
      modLoader: validatedData.modLoader,
      modLoaderVersion: validatedData.modLoaderVersion,
      seed: seed,
      settings: validatedData.settings,
      status: ServerStatus.STOPPED,
    });

    const savedServer = await serverRepository.save(server);

    // Create Docker container
    try {
      const containerId = await dockerService.createContainer(savedServer);
      savedServer.dockerContainerId = containerId;
      await serverRepository.save(savedServer);
    } catch (dockerError) {
      console.error('Error creating Docker container:', dockerError);
      // Delete the server entity if container creation failed
      await serverRepository.remove(savedServer);
      return NextResponse.json(
        { error: 'Failed to create Docker container' },
        { status: 500 }
      );
    }

    return NextResponse.json({ server: savedServer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}
