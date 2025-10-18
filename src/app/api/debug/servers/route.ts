import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const servers = await serverRepository.find({
      order: { createdAt: 'DESC' },
    });

    const debugInfo = servers.map(server => ({
      id: server.id,
      name: server.name,
      modLoader: server.modLoader,
      modLoaderVersion: server.modLoaderVersion,
      modLoaderVersionIsNull: server.modLoaderVersion === null,
      modLoaderVersionIsUndefined: server.modLoaderVersion === undefined,
      modLoaderVersionIsEmpty: server.modLoaderVersion === '',
    }));

    return NextResponse.json({ servers: debugInfo });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
