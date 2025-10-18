import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ServerMod } from '@/lib/database/entities';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; modId: string }> }
) {
  try {
    const { id, modId } = await context.params;
    const serverId = parseInt(id, 10);
    const modIdNum = parseInt(modId, 10);

    if (isNaN(serverId) || isNaN(modIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const db = await getDatabase();
    const serverModRepo = db.getRepository(ServerMod);

    const serverMod = await serverModRepo.findOne({
      where: { serverId, modId: modIdNum },
    });

    if (!serverMod) {
      return NextResponse.json({ error: 'Server mod not found' }, { status: 404 });
    }

    serverMod.enabled = enabled;
    await serverModRepo.save(serverMod);

    return NextResponse.json({ success: true, serverMod });
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
  context: { params: Promise<{ id: string; modId: string }> }
) {
  try {
    const { id, modId } = await context.params;
    const serverId = parseInt(id, 10);
    const modIdNum = parseInt(modId, 10);

    if (isNaN(serverId) || isNaN(modIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const db = await getDatabase();
    const serverModRepo = db.getRepository(ServerMod);

    const serverMod = await serverModRepo.findOne({
      where: { serverId, modId: modIdNum },
    });

    if (!serverMod) {
      return NextResponse.json({ error: 'Server mod not found' }, { status: 404 });
    }

    await serverModRepo.remove(serverMod);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing server mod:', error);
    return NextResponse.json(
      { error: 'Failed to remove server mod' },
      { status: 500 }
    );
  }
}
