import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { RecipeDatapack, RecipeType } from '@/lib/database/entities/RecipeDatapack';
import { z } from 'zod';

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

// Helper schemas for recipe components
const itemIngredientSchema = z.object({
  item: z.string().min(1, 'Item ID is required'),
  tag: z.string().optional(),
});

const resultWithCountSchema = z.object({
  item: z.string().min(1, 'Result item ID is required'),
  count: z.number().int().min(1, 'Count must be at least 1').max(64, 'Count cannot exceed 64').optional(),
});

// Recipe-type specific schemas
const craftingShapedDataSchema = z.object({
  pattern: z.array(z.string().max(3, 'Each pattern row can have a maximum of 3 characters'))
    .min(1, 'Pattern must have at least 1 row')
    .max(3, 'Pattern can have a maximum of 3 rows')
    .refine((pattern) => pattern.some(row => row.trim().length > 0), {
      message: 'Pattern cannot be empty - at least one row must have content',
    }),
  key: z.record(z.string(), itemIngredientSchema)
    .refine((key) => Object.keys(key).length > 0, {
      message: 'At least one ingredient mapping is required',
    }),
  result: resultWithCountSchema,
  group: z.string().optional(),
});

const craftingShapelessDataSchema = z.object({
  ingredients: z.array(itemIngredientSchema)
    .min(1, 'At least 1 ingredient is required')
    .max(9, 'Maximum 9 ingredients allowed'),
  result: resultWithCountSchema,
  group: z.string().optional(),
});

const cookingDataSchema = z.object({
  ingredient: itemIngredientSchema,
  result: z.string().min(1, 'Result item ID is required'),
  experience: z.number()
    .min(0, 'Experience cannot be negative')
    .max(100, 'Experience cannot exceed 100')
    .optional(),
  cookingtime: z.number()
    .int('Cooking time must be a whole number')
    .positive('Cooking time must be greater than 0')
    .max(72000, 'Cooking time cannot exceed 72000 ticks (1 hour)')
    .optional(),
  group: z.string().optional(),
});

const stonecuttingDataSchema = z.object({
  ingredient: itemIngredientSchema,
  result: z.string().min(1, 'Result item ID is required'),
  count: z.number()
    .int('Count must be a whole number')
    .min(1, 'Count must be at least 1')
    .max(64, 'Count cannot exceed 64')
    .optional(),
  group: z.string().optional(),
});

const smithingTransformDataSchema = z.object({
  template: itemIngredientSchema,
  base: itemIngredientSchema,
  addition: itemIngredientSchema,
  result: z.object({
    item: z.string().min(1, 'Result item ID is required'),
  }),
});

// Union schema for recipe data based on type
const recipeDataSchema = z.union([
  craftingShapedDataSchema,
  craftingShapelessDataSchema,
  cookingDataSchema,
  stonecuttingDataSchema,
  smithingTransformDataSchema,
]);

const updateRecipeSchema = z.object({
  name: z.string()
    .min(1, 'Recipe name is required')
    .max(255, 'Recipe name cannot exceed 255 characters')
    .regex(/^[a-z0-9_\-]+$/, 'Recipe name can only contain lowercase letters, numbers, underscores, and hyphens')
    .optional(),
  namespace: z.string()
    .min(1, 'Namespace is required')
    .max(255, 'Namespace cannot exceed 255 characters')
    .regex(/^[a-z0-9_\-]+$/, 'Namespace can only contain lowercase letters, numbers, underscores, and hyphens')
    .optional(),
  type: z.string()
    .min(1, 'Recipe type is required')
    .refine((type) => {
      // Support both namespaced (minecraft:crafting_shaped) and short form (crafting_shaped)
      const shortForm = type.includes(':') ? type.split(':')[1] : type;
      return ['crafting_shaped', 'crafting_shapeless', 'smelting', 'blasting', 'smoking', 'campfire_cooking', 'stonecutting', 'smithing_transform'].includes(shortForm);
    }, {
      message: 'Invalid recipe type. Supported types: crafting_shaped, crafting_shapeless, smelting, blasting, smoking, campfire_cooking, stonecutting, smithing_transform (with optional namespace prefix)',
    })
    .optional(),
  data: recipeDataSchema.optional(),
  enabled: z.boolean().optional(),
});

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

    const recipe = await recipeRepository.findOne({
      where: { id: recipeIdInt, serverId },
      relations: ['server'],
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ recipe: transformRecipe(recipe) });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const validatedData = updateRecipeSchema.parse(body);

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

    // Check if name/namespace change conflicts with existing recipe
    if ((validatedData.name && validatedData.name !== recipe.name) ||
        (validatedData.namespace && validatedData.namespace !== recipe.namespace)) {
      const newName = validatedData.name || recipe.name;
      const newNamespace = validatedData.namespace || recipe.namespace;

      const existingRecipe = await recipeRepository.findOne({
        where: {
          serverId,
          name: newName,
          namespace: newNamespace,
        },
      });

      if (existingRecipe && existingRecipe.id !== recipe.id) {
        return NextResponse.json(
          { error: 'A recipe with this name and namespace already exists for this server' },
          { status: 409 }
        );
      }
    }

    // Map the schema enum to RecipeType enum if type is being updated
    if (validatedData.type) {
      // Extract short form from namespaced type (e.g., minecraft:crafting_shaped -> crafting_shaped)
      const shortType = validatedData.type.includes(':')
        ? validatedData.type.split(':')[1]
        : validatedData.type;

      const recipeTypeMap: { [key: string]: RecipeType } = {
        'crafting_shaped': RecipeType.CRAFTING_SHAPED,
        'crafting_shapeless': RecipeType.CRAFTING_SHAPELESS,
        'smelting': RecipeType.SMELTING,
        'blasting': RecipeType.BLASTING,
        'smoking': RecipeType.SMOKING,
        'campfire_cooking': RecipeType.CAMPFIRE_COOKING,
        'stonecutting': RecipeType.STONECUTTING,
        'smithing_transform': RecipeType.SMITHING_TRANSFORM,
      };

      // Map 'type' and 'data' to 'recipeType' and 'recipeData' for the entity
      const { type, data, ...rest } = validatedData;
      Object.assign(recipe, {
        ...rest,
        recipeType: recipeTypeMap[shortType],
        ...(data && { recipeData: data }),
      });
    } else {
      // Map 'data' to 'recipeData' for the entity
      const { data, ...rest } = validatedData;
      Object.assign(recipe, {
        ...rest,
        ...(data && { recipeData: data }),
      });
    }

    await recipeRepository.save(recipe);

    // Fetch the complete recipe with relations
    const updatedRecipe = await recipeRepository.findOne({
      where: { id: recipe.id },
      relations: ['server'],
    });

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe ? transformRecipe(updatedRecipe) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await recipeRepository.remove(recipe);

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
