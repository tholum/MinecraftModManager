import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ServerMod } from '@/lib/database/entities';

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
