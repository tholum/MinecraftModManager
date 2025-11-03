import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { RecipeDatapack, RecipeType } from '@/lib/database/entities/RecipeDatapack';
import { Server } from '@/lib/database/entities';
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

const createRecipeSchema = z.object({
  name: z.string()
    .min(1, 'Recipe name is required')
    .max(255, 'Recipe name cannot exceed 255 characters')
    .regex(/^[a-z0-9_\-]+$/, 'Recipe name can only contain lowercase letters, numbers, underscores, and hyphens'),
  namespace: z.string()
    .min(1, 'Namespace is required')
    .max(255, 'Namespace cannot exceed 255 characters')
    .regex(/^[a-z0-9_\-]+$/, 'Namespace can only contain lowercase letters, numbers, underscores, and hyphens'),
  type: z.string()
    .min(1, 'Recipe type is required')
    .refine((type) => {
      // Support both namespaced (minecraft:crafting_shaped) and short form (crafting_shaped)
      const shortForm = type.includes(':') ? type.split(':')[1] : type;
      return ['crafting_shaped', 'crafting_shapeless', 'smelting', 'blasting', 'smoking', 'campfire_cooking', 'stonecutting', 'smithing_transform'].includes(shortForm);
    }, {
      message: 'Invalid recipe type. Supported types: crafting_shaped, crafting_shapeless, smelting, blasting, smoking, campfire_cooking, stonecutting, smithing_transform (with optional namespace prefix)',
    }),
  data: recipeDataSchema,
  enabled: z.boolean().optional().default(true),
});

export async function GET(
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

    const db = await getDatabase();
    const recipeRepository = db.getRepository(RecipeDatapack);

    const recipes = await recipeRepository.find({
      where: { serverId },
      relations: ['server'],
      order: { id: 'ASC' },
    });

    // Transform recipes to match frontend interface (recipeType -> type, recipeData -> data)
    const transformedRecipes = recipes.map(transformRecipe);

    return NextResponse.json({ recipes: transformedRecipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

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
    const validatedData = createRecipeSchema.parse(body);

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);
    const recipeRepository = db.getRepository(RecipeDatapack);

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

    // Check if a recipe with this name and namespace already exists for this server
    const existingRecipe = await recipeRepository.findOne({
      where: {
        serverId,
        name: validatedData.name,
        namespace: validatedData.namespace,
      },
    });

    if (existingRecipe) {
      return NextResponse.json(
        { error: 'A recipe with this name and namespace already exists for this server' },
        { status: 409 }
      );
    }

    // Extract short form from namespaced type (e.g., minecraft:crafting_shaped -> crafting_shaped)
    const shortType = validatedData.type.includes(':')
      ? validatedData.type.split(':')[1]
      : validatedData.type;

    // Map the schema enum to RecipeType enum
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

    // Create the recipe
    const recipe = recipeRepository.create({
      serverId,
      name: validatedData.name,
      namespace: validatedData.namespace,
      recipeType: recipeTypeMap[shortType],
      recipeData: validatedData.data,
      enabled: validatedData.enabled,
    });

    await recipeRepository.save(recipe);

    // Fetch the complete recipe with relations
    const completeRecipe = await recipeRepository.findOne({
      where: { id: recipe.id },
      relations: ['server'],
    });

    // Transform recipe to match frontend interface (recipeType -> type, recipeData -> data)
    const transformedRecipe = completeRecipe ? transformRecipe(completeRecipe) : null;

    return NextResponse.json(
      {
        success: true,
        recipe: transformedRecipe,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
