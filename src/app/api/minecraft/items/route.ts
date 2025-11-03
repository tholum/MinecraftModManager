import { NextRequest, NextResponse } from 'next/server';
import minecraftItemsService from '@/lib/services/minecraft-items.service';

/**
 * GET /api/minecraft/items
 * Returns Minecraft item data, optionally filtered by search query
 *
 * Query parameters:
 * - version: Minecraft version (default: '1.21')
 * - search: Optional search string to filter items by name or displayName
 *
 * Examples:
 * - /api/minecraft/items?search=diamond
 * - /api/minecraft/items?version=1.20.1&search=sword
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get('version') || '1.21';
    const searchQuery = searchParams.get('search');

    // Get all items for the specified version from the service
    const allItems = minecraftItemsService.getItems(version);

    // Filter items if search query provided
    let filteredItems = allItems;
    if (searchQuery && searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase().trim();
      filteredItems = allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.displayName.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(
      {
        items: filteredItems,
        count: filteredItems.length,
        version,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching Minecraft items:', error);

    // Check if it's our custom error
    if (error instanceof Error && error.message.includes('Failed to load Minecraft item data')) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch Minecraft items' },
      { status: 500 }
    );
  }
}
