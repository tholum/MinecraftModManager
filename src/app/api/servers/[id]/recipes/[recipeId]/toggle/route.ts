import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { RecipeDatapack } from '@/lib/database/entities/RecipeDatapack';

// Helper function to transform RecipeDatapack entity to frontend Recipe interface
function transformRecipe(recipe: RecipeDatapack) {
  return {
    id: recipe.id,
    serverId: recipe.serverId,
    name: recipe.name,
    namespace: recipe.namespace,
    type: recipe.recipeType,
    data: recipe.recipeData,
    enabled: recipe.enabled,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

export async function POST(
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

    const recipe = await recipeRepository.findOne({
      where: { id: recipeIdInt, serverId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Toggle the enabled status
    recipe.enabled = !recipe.enabled;
    await recipeRepository.save(recipe);

    // Fetch the complete recipe with relations
    const updatedRecipe = await recipeRepository.findOne({
      where: { id: recipe.id },
      relations: ['server'],
    });

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe ? transformRecipe(updatedRecipe) : null,
      message: `Recipe ${recipe.enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling recipe:', error);
    return NextResponse.json(
      { error: 'Failed to toggle recipe status' },
      { status: 500 }
    );
  }
}
