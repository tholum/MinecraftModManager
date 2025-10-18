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

    // Update status to starting
    server.status = ServerStatus.STARTING;
    await serverRepository.save(server);

    try {
      await dockerService.startContainer(server.id);

      // Update status to running
      server.status = ServerStatus.RUNNING;
      await serverRepository.save(server);

      return NextResponse.json({ server });
    } catch (error) {
      // Update status to error
      server.status = ServerStatus.ERROR;
      await serverRepository.save(server);
      throw error;
    }
  } catch (error) {
    console.error('Error starting server:', error);
    return NextResponse.json(
      { error: 'Failed to start server' },
      { status: 500 }
    );
  }
}
