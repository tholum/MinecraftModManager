import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { RecipeDatapack } from '@/lib/database/entities/RecipeDatapack';
import datapackService from '@/lib/services/datapack.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const { id, recipeId } = await params;
    const serverId = parseInt(id, 10);
    const recipeIdInt = parseInt(recipeId, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    if (isNaN(recipeIdInt)) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const recipeRepository = db.getRepository(RecipeDatapack);

    // Verify the recipe exists and belongs to this server
    const recipe = await recipeRepository.findOne({
      where: { id: recipeIdInt, serverId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Export the recipe to JSON
    const exportedJson = await datapackService.exportRecipeToJson(recipeIdInt);

    // Create the filename with sanitization
    const filename = `recipe-${recipe.namespace}-${recipe.name}.json`.replace(/[^a-z0-9.-]/gi, '_');

    // Return as downloadable file
    return new NextResponse(JSON.stringify(exportedJson, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to export recipe' },
      { status: 500 }
    );
  }
}
