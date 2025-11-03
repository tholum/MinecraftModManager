import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import datapackService from '@/lib/services/datapack.service';

export async function POST(
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON data provided' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    // Verify the server exists
    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Import the recipe using the datapack service
    const importedRecipe = await datapackService.importRecipeFromJson(body, serverId);

    return NextResponse.json(
      {
        success: true,
        recipe: importedRecipe,
        message: `Successfully imported recipe: ${importedRecipe.namespace}:${importedRecipe.name}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to import recipe', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
