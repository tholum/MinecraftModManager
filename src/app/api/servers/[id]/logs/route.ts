import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tail = parseInt(searchParams.get('tail') || '100');

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

    try {
      const logs = await dockerService.getContainerLogs(server.id, tail);
      return NextResponse.json({ logs });
    } catch (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching server logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server logs' },
      { status: 500 }
    );
  }
}
