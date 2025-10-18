import { NextRequest, NextResponse } from 'next/server';
import modrinthService from '@/lib/services/modrinth.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const minecraftVersion = searchParams.get('minecraftVersion') || undefined;
    const modLoader = searchParams.get('modLoader') || undefined;

    const versions = await modrinthService.getProjectVersions(
      id,
      minecraftVersion,
      modLoader
    );

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching Modrinth versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod versions' },
      { status: 500 }
    );
  }
}
