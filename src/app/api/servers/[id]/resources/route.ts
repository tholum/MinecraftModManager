import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';

export async function PATCH(
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
    const { memory, cpuLimit } = body;

    // Validate memory format
    if (memory && !/^\d+(\.\d+)?[KMGT]?$/i.test(memory)) {
      return NextResponse.json(
        { error: 'Invalid memory format. Use formats like: 2G, 4096M, 512M' },
        { status: 400 }
      );
    }

    // Validate CPU limit
    if (cpuLimit !== null && cpuLimit !== undefined) {
      const cpuLimitNum = parseFloat(cpuLimit);
      if (isNaN(cpuLimitNum) || cpuLimitNum < 0 || cpuLimitNum > 64) {
        return NextResponse.json(
          { error: 'Invalid CPU limit. Must be between 0 and 64 cores' },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Check if server is running
    if (server.status === 'running') {
      return NextResponse.json(
        { error: 'Server must be stopped to change resources. Stop the server and try again.' },
        { status: 400 }
      );
    }

    // Update server resources
    server.memory = memory;
    server.cpuLimit = cpuLimit !== null && cpuLimit !== undefined ? parseFloat(cpuLimit) : null;

    await serverRepository.save(server);

    console.log(`Updated resources for server ${serverId}: memory=${memory}, cpuLimit=${cpuLimit}`);

    // If container exists, delete it so it will be recreated with new resources on next start
    try {
      await dockerService.deleteContainer(serverId);
      console.log(`Deleted existing container for server ${serverId} to apply new resources`);
    } catch (error) {
      // Container might not exist, which is fine
      console.log(`No existing container to delete for server ${serverId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Resources updated successfully. Start the server to apply changes.',
      memory: server.memory,
      cpuLimit: server.cpuLimit,
    });
  } catch (error: any) {
    console.error('Error updating server resources:', error);
    return NextResponse.json(
      { error: 'Failed to update server resources', details: error.message },
      { status: 500 }
    );
  }
}
