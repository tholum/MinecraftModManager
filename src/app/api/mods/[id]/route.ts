import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Mod } from '@/lib/database/entities';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const modId = parseInt(id, 10);

    if (isNaN(modId)) {
      return NextResponse.json({ error: 'Invalid mod ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const modRepo = db.getRepository(Mod);

    const mod = await modRepo.findOne({ where: { id: modId } });

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    await modRepo.remove(mod);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mod:', error);
    return NextResponse.json(
      { error: 'Failed to delete mod' },
      { status: 500 }
    );
  }
}
