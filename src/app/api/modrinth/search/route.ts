import { NextRequest, NextResponse } from 'next/server';
import modrinthService from '@/lib/services/modrinth.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const minecraftVersion = searchParams.get('minecraftVersion') || undefined;
    const modLoader = searchParams.get('modLoader') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const results = await modrinthService.searchMods(
      query,
      minecraftVersion,
      modLoader,
      limit
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching Modrinth:', error);
    return NextResponse.json(
      { error: 'Failed to search Modrinth' },
      { status: 500 }
    );
  }
}
