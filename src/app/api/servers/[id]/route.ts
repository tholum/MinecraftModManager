import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import { z } from 'zod';

const UpdateServerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1024).max(65535).optional(),
  minecraftVersion: z.string().optional(),
  modLoader: z.string().optional(),
  modLoaderVersion: z.string().optional(),
  seed: z.string().optional(),
  settings: z.any().optional(),
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
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Update status from Docker
    const status = await dockerService.getContainerStatus(server.id);
    if (server.status !== status) {
      server.status = status;
      await serverRepository.save(server);
    }

    return NextResponse.json({ server });
  } catch (error) {
    console.error('Error fetching server:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateServerSchema.parse(body);

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Check if port change conflicts with existing server
    if (validatedData.port && validatedData.port !== server.port) {
      const existingServer = await serverRepository.findOne({
        where: { port: validatedData.port },
      });

      if (existingServer) {
        return NextResponse.json(
          { error: 'Port is already in use' },
          { status: 400 }
        );
      }
    }

    // Update server properties
    Object.assign(server, validatedData);
    const updatedServer = await serverRepository.save(server);

    // If server settings changed and container exists, we need to recreate it
    // For now, just return the updated server
    // TODO: Implement container recreation on critical changes

    return NextResponse.json({ server: updatedServer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating server:', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Delete Docker container
    try {
      await dockerService.deleteContainer(server.id);
    } catch (dockerError) {
      console.error('Error deleting Docker container:', dockerError);
      // Continue with database deletion even if container deletion fails
    }

    // Delete server from database
    await serverRepository.remove(server);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}
