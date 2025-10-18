import { NextRequest, NextResponse } from 'next/server';
import versionsService from '@/lib/services/versions.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'minecraft', 'neoforge', 'fabric'
    const minecraftVersion = searchParams.get('minecraftVersion');

    if (type === 'minecraft') {
      const versions = await versionsService.getMinecraftVersions();
      return NextResponse.json({ versions });
    } else if (type === 'neoforge' && minecraftVersion) {
      const versions = await versionsService.getNeoForgeVersions(minecraftVersion);
      return NextResponse.json({ versions });
    } else if (type === 'fabric' && minecraftVersion) {
      const versions = await versionsService.getFabricVersions(minecraftVersion);
      return NextResponse.json({ versions });
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}
