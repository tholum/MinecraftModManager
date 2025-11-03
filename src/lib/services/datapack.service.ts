import { RecipeDatapack, RecipeType } from '../database/entities/RecipeDatapack';
import { getDatabase } from '../database/config';
import path from 'path';
import fs from 'fs/promises';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class DatapackService {
  private static instance: DatapackService;

  private constructor() {}

  static getInstance(): DatapackService {
    if (!DatapackService.instance) {
      DatapackService.instance = new DatapackService();
    }
    return DatapackService.instance;
  }

  /**
   * Synchronize all enabled recipes for a server to its datapack folder
   */
  async syncRecipesForServer(serverId: number): Promise<void> {
    // Validate serverId
    if (!Number.isInteger(serverId) || serverId <= 0) {
      throw new Error(`Invalid server ID: ${serverId}. Server ID must be a positive integer.`);
    }

    try {
      const db = await getDatabase();
      const recipeRepository = db.getRepository(RecipeDatapack);

      // Fetch all enabled recipes for this server
      const recipes = await recipeRepository.find({
        where: { serverId, enabled: true },
      });

      console.log(`Syncing ${recipes.length} enabled recipes for server ${serverId}...`);

      // Create datapack directory structure
      const datapackPath = this.getDatapackPath(serverId);
      await fs.mkdir(datapackPath, { recursive: true });

      // Generate and write pack.mcmeta
      const packMcmeta = this.generatePackMcmeta();
      const packMcmetaPath = path.join(datapackPath, 'pack.mcmeta');
      await fs.writeFile(packMcmetaPath, JSON.stringify(packMcmeta, null, 2), 'utf8');

      // Track existing recipe files for cleanup
      const existingRecipes = new Set<string>();
      const dataPath = path.join(datapackPath, 'data');

      try {
        // Scan for existing recipe files
        const namespaces = await fs.readdir(dataPath).catch(() => []);
        for (const namespace of namespaces) {
          const recipesPath = path.join(dataPath, namespace, 'recipe');
          try {
            const files = await fs.readdir(recipesPath);
            files.forEach(file => {
              existingRecipes.add(path.join(recipesPath, file));
            });
          } catch {
            // Recipe directory doesn't exist for this namespace
          }
        }
      } catch {
        // Data directory doesn't exist yet
      }

      // Generate recipe files
      const generatedFiles = new Set<string>();
      for (const recipe of recipes) {
        try {
          const recipePath = this.getRecipePath(serverId, recipe.namespace, recipe.name);
          const recipeDir = path.dirname(recipePath);

          // Create recipe directory
          await fs.mkdir(recipeDir, { recursive: true });

          // Generate recipe JSON
          const recipeJson = this.generateRecipeJson(recipe);

          // Write recipe file
          await fs.writeFile(recipePath, JSON.stringify(recipeJson, null, 2), 'utf8');
          generatedFiles.add(recipePath);

          console.log(`✓ Generated recipe: ${recipe.namespace}:${recipe.name}`);
        } catch (error) {
          console.error(`Error generating recipe ${recipe.name}:`, error);
        }
      }

      // Clean up old recipe files that no longer exist in DB
      for (const existingFile of existingRecipes) {
        if (!generatedFiles.has(existingFile)) {
          try {
            await fs.unlink(existingFile);
            console.log(`✓ Removed old recipe file: ${existingFile}`);
          } catch (error) {
            console.error(`Error removing old recipe file ${existingFile}:`, error);
          }
        }
      }

      console.log(`Recipe sync complete for server ${serverId}`);
    } catch (error) {
      console.error('Error syncing recipes:', error);
      throw new Error(`Failed to sync recipes for server ${serverId}: ${error}`);
    }
  }

  /**
   * Generate pack.mcmeta file content
   */
  generatePackMcmeta(): object {
    return {
      pack: {
        pack_format: 48, // Minecraft 1.21+
        description: 'Custom recipes managed by Minecraft Mod Manager',
      },
    };
  }

  /**
   * Transform ingredient - ingredients should keep the "item" field format
   * Correct format for 1.21: { item: "minecraft:coal" } or { tag: "minecraft:logs" }
   * Note: Ingredients do NOT use "id", only results do!
   */
  private transformIngredient(ingredient: any): any {
    if (typeof ingredient === 'string') {
      // If it's a string, wrap it in an object with "item" field
      // Check if it's a tag (starts with #)
      if (ingredient.startsWith('#')) {
        return { tag: ingredient.substring(1) };
      }
      return { item: ingredient };
    }
    if (ingredient && typeof ingredient === 'object') {
      // If it already has "item" or "tag", it's in correct format
      if (ingredient.item || ingredient.tag) {
        return ingredient;
      }
      // If it has "id", convert to "item" for ingredients
      if (ingredient.id) {
        return { item: ingredient.id };
      }
    }
    return ingredient;
  }

  /**
   * Transform result from Bedrock Edition format to Java Edition format
   * Bedrock: { item: "minecraft:diamond", count: 1 }
   * Java: { id: "minecraft:diamond", count: 1 }
   */
  private transformResult(result: any): any {
    if (typeof result === 'string') {
      // String format is valid for some recipe types (smelting, etc.)
      return result;
    }
    if (result && typeof result === 'object') {
      // Convert { item: "...", count: 1 } to { id: "...", count: 1 }
      if (result.item) {
        const transformed: any = { id: result.item };
        if (result.count !== undefined) {
          transformed.count = result.count;
        }
        return transformed;
      }
    }
    return result;
  }

  /**
   * Transform shaped recipe key from Bedrock to Java Edition format
   * Bedrock: { A: { item: "minecraft:coal" } }
   * Java: { A: "minecraft:coal" }
   */
  private transformKey(key: any): any {
    if (!key || typeof key !== 'object') {
      return key;
    }
    const transformed: any = {};
    for (const [letter, ingredient] of Object.entries(key)) {
      transformed[letter] = this.transformIngredient(ingredient);
    }
    return transformed;
  }

  /**
   * Transform ingredients array from Bedrock to Java Edition format
   * Bedrock: [{ item: "minecraft:coal" }]
   * Java: ["minecraft:coal"]
   */
  private transformIngredients(ingredients: any[]): any[] {
    if (!Array.isArray(ingredients)) {
      return ingredients;
    }
    return ingredients.map(ingredient => this.transformIngredient(ingredient));
  }

  /**
   * Generate Minecraft recipe JSON from RecipeDatapack entity
   */
  generateRecipeJson(recipe: RecipeDatapack): any {
    const recipeData = recipe.recipeData;

    switch (recipe.recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        return {
          type: 'minecraft:crafting_shaped',
          pattern: recipeData.pattern || [],
          key: this.transformKey(recipeData.key || {}),
          result: this.transformResult(recipeData.result || {}),
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.CRAFTING_SHAPELESS:
        return {
          type: 'minecraft:crafting_shapeless',
          ingredients: this.transformIngredients(recipeData.ingredients || []),
          result: this.transformResult(recipeData.result || {}),
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.SMELTING:
        return {
          type: 'minecraft:smelting',
          ingredient: this.transformIngredient(recipeData.ingredient || {}),
          result: this.transformResult(recipeData.result || ''),
          experience: recipeData.experience ?? 0.1,
          cookingtime: recipeData.cookingtime ?? 200,
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.BLASTING:
        return {
          type: 'minecraft:blasting',
          ingredient: this.transformIngredient(recipeData.ingredient || {}),
          result: this.transformResult(recipeData.result || ''),
          experience: recipeData.experience ?? 0.1,
          cookingtime: recipeData.cookingtime ?? 100,
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.SMOKING:
        return {
          type: 'minecraft:smoking',
          ingredient: this.transformIngredient(recipeData.ingredient || {}),
          result: this.transformResult(recipeData.result || ''),
          experience: recipeData.experience ?? 0.1,
          cookingtime: recipeData.cookingtime ?? 100,
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.CAMPFIRE_COOKING:
        return {
          type: 'minecraft:campfire_cooking',
          ingredient: this.transformIngredient(recipeData.ingredient || {}),
          result: this.transformResult(recipeData.result || ''),
          experience: recipeData.experience ?? 0.1,
          cookingtime: recipeData.cookingtime ?? 600,
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.STONECUTTING:
        return {
          type: 'minecraft:stonecutting',
          ingredient: this.transformIngredient(recipeData.ingredient || {}),
          result: this.transformResult(recipeData.result || ''),
          count: recipeData.count ?? 1,
          ...(recipeData.group && { group: recipeData.group }),
        };

      case RecipeType.SMITHING_TRANSFORM:
        return {
          type: 'minecraft:smithing_transform',
          template: this.transformIngredient(recipeData.template || {}),
          base: this.transformIngredient(recipeData.base || {}),
          addition: this.transformIngredient(recipeData.addition || {}),
          result: this.transformResult(recipeData.result || {}),
        };

      default:
        throw new Error(`Unsupported recipe type: ${recipe.recipeType}`);
    }
  }

  /**
   * Validate recipe structure and data
   */
  validateRecipe(recipeData: any): ValidationResult {
    const errors: string[] = [];

    if (!recipeData.type) {
      errors.push('Recipe type is required');
      return { valid: false, errors };
    }

    const type = recipeData.type.replace('minecraft:', '');

    switch (type) {
      case 'crafting_shaped':
        // Validate pattern
        if (!recipeData.pattern || !Array.isArray(recipeData.pattern)) {
          errors.push('Shaped crafting requires a pattern array');
        } else {
          if (recipeData.pattern.length === 0) {
            errors.push('Pattern array cannot be empty');
          }
          if (recipeData.pattern.length > 3) {
            errors.push('Pattern can have a maximum of 3 rows');
          }

          // Check that pattern is not all empty
          const hasContent = recipeData.pattern.some((row: string) => row && row.trim().length > 0);
          if (!hasContent) {
            errors.push('Pattern cannot be empty - at least one row must have content');
          }

          // Validate each row length
          recipeData.pattern.forEach((row: string, idx: number) => {
            if (typeof row !== 'string') {
              errors.push(`Pattern row ${idx + 1} must be a string`);
            } else if (row.length > 3) {
              errors.push(`Pattern row ${idx + 1} cannot exceed 3 characters`);
            }
          });
        }

        // Validate key mapping
        if (!recipeData.key || typeof recipeData.key !== 'object') {
          errors.push('Shaped crafting requires a key object mapping pattern characters to items');
        } else if (Object.keys(recipeData.key).length === 0) {
          errors.push('Key object must define at least one ingredient');
        }

        // Validate result
        if (!recipeData.result) {
          errors.push('Recipe must have a result');
        } else {
          if (typeof recipeData.result !== 'object') {
            errors.push('Result must be an object with "item" property');
          } else {
            if (!recipeData.result.item || typeof recipeData.result.item !== 'string') {
              errors.push('Result must have a valid "item" property');
            }
            if (recipeData.result.count !== undefined) {
              if (typeof recipeData.result.count !== 'number') {
                errors.push('Result count must be a number');
              } else if (recipeData.result.count < 1 || recipeData.result.count > 64) {
                errors.push('Result count must be between 1 and 64');
              }
            }
          }
        }
        break;

      case 'crafting_shapeless':
        // Validate ingredients
        if (!recipeData.ingredients || !Array.isArray(recipeData.ingredients)) {
          errors.push('Shapeless crafting requires an ingredients array');
        } else {
          if (recipeData.ingredients.length === 0) {
            errors.push('Shapeless crafting must have at least 1 ingredient');
          }
          if (recipeData.ingredients.length > 9) {
            errors.push('Shapeless crafting can have a maximum of 9 ingredients');
          }

          recipeData.ingredients.forEach((ingredient: any, idx: number) => {
            if (!ingredient || typeof ingredient !== 'object') {
              errors.push(`Ingredient ${idx + 1} must be an object`);
            } else if (!ingredient.item || typeof ingredient.item !== 'string') {
              errors.push(`Ingredient ${idx + 1} must have a valid "item" property`);
            }
          });
        }

        // Validate result
        if (!recipeData.result) {
          errors.push('Recipe must have a result');
        } else {
          if (typeof recipeData.result !== 'object') {
            errors.push('Result must be an object with "item" property');
          } else {
            if (!recipeData.result.item || typeof recipeData.result.item !== 'string') {
              errors.push('Result must have a valid "item" property');
            }
            if (recipeData.result.count !== undefined) {
              if (typeof recipeData.result.count !== 'number') {
                errors.push('Result count must be a number');
              } else if (recipeData.result.count < 1 || recipeData.result.count > 64) {
                errors.push('Result count must be between 1 and 64');
              }
            }
          }
        }
        break;

      case 'smelting':
      case 'blasting':
      case 'smoking':
      case 'campfire_cooking':
        // Validate ingredient
        if (!recipeData.ingredient) {
          errors.push(`${type.replace('_', ' ')} requires an ingredient`);
        } else if (typeof recipeData.ingredient !== 'object') {
          errors.push('Ingredient must be an object with "item" property');
        } else if (!recipeData.ingredient.item || typeof recipeData.ingredient.item !== 'string') {
          errors.push('Ingredient must have a valid "item" property');
        }

        // Validate result
        if (!recipeData.result) {
          errors.push(`${type.replace('_', ' ')} requires a result`);
        } else if (typeof recipeData.result !== 'string') {
          errors.push('Cooking recipe result must be a string (item ID)');
        }

        // Validate experience
        if (recipeData.experience !== undefined) {
          if (typeof recipeData.experience !== 'number') {
            errors.push('Experience must be a number');
          } else if (recipeData.experience < 0 || recipeData.experience > 100) {
            errors.push('Experience must be between 0 and 100');
          }
        }

        // Validate cooking time
        if (recipeData.cookingtime !== undefined) {
          if (typeof recipeData.cookingtime !== 'number') {
            errors.push('Cooking time must be a number (in ticks)');
          } else if (recipeData.cookingtime <= 0) {
            errors.push('Cooking time must be greater than 0');
          } else if (recipeData.cookingtime > 72000) {
            errors.push('Cooking time cannot exceed 72000 ticks (1 hour)');
          } else if (!Number.isInteger(recipeData.cookingtime)) {
            errors.push('Cooking time must be a whole number (ticks)');
          }
        }
        break;

      case 'stonecutting':
        // Validate ingredient
        if (!recipeData.ingredient) {
          errors.push('Stonecutting requires an ingredient');
        } else if (typeof recipeData.ingredient !== 'object') {
          errors.push('Ingredient must be an object with "item" property');
        } else if (!recipeData.ingredient.item || typeof recipeData.ingredient.item !== 'string') {
          errors.push('Ingredient must have a valid "item" property');
        }

        // Validate result
        if (!recipeData.result) {
          errors.push('Stonecutting requires a result');
        } else if (typeof recipeData.result !== 'string') {
          errors.push('Stonecutting result must be a string (item ID)');
        }

        // Validate count
        if (recipeData.count !== undefined) {
          if (typeof recipeData.count !== 'number') {
            errors.push('Count must be a number');
          } else if (recipeData.count < 1 || recipeData.count > 64) {
            errors.push('Count must be between 1 and 64');
          } else if (!Number.isInteger(recipeData.count)) {
            errors.push('Count must be a whole number');
          }
        }
        break;

      case 'smithing':
      case 'smithing_transform':
        // Validate template
        if (!recipeData.template) {
          errors.push('Smithing requires a template item (Minecraft 1.20+)');
        } else if (typeof recipeData.template !== 'object') {
          errors.push('Template must be an object with "item" property');
        } else if (!recipeData.template.item || typeof recipeData.template.item !== 'string') {
          errors.push('Template must have a valid "item" property');
        }

        // Validate base
        if (!recipeData.base) {
          errors.push('Smithing requires a base item');
        } else if (typeof recipeData.base !== 'object') {
          errors.push('Base must be an object with "item" property');
        } else if (!recipeData.base.item || typeof recipeData.base.item !== 'string') {
          errors.push('Base must have a valid "item" property');
        }

        // Validate addition
        if (!recipeData.addition) {
          errors.push('Smithing requires an addition item');
        } else if (typeof recipeData.addition !== 'object') {
          errors.push('Addition must be an object with "item" property');
        } else if (!recipeData.addition.item || typeof recipeData.addition.item !== 'string') {
          errors.push('Addition must have a valid "item" property');
        }

        // Validate result
        if (!recipeData.result) {
          errors.push('Smithing requires a result');
        } else if (typeof recipeData.result !== 'object') {
          errors.push('Result must be an object with "item" property');
        } else if (!recipeData.result.item || typeof recipeData.result.item !== 'string') {
          errors.push('Result must have a valid "item" property');
        }
        break;

      default:
        errors.push(`Unknown recipe type: ${type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export a recipe to portable JSON format
   */
  async exportRecipeToJson(recipeId: number): Promise<any> {
    try {
      const db = await getDatabase();
      const recipeRepository = db.getRepository(RecipeDatapack);

      const recipe = await recipeRepository.findOne({
        where: { id: recipeId },
      });

      if (!recipe) {
        throw new Error(`Recipe with ID ${recipeId} not found`);
      }

      // Generate the Minecraft recipe JSON
      const minecraftJson = this.generateRecipeJson(recipe);

      // Return a portable format with metadata
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        recipe: {
          name: recipe.name,
          namespace: recipe.namespace,
          type: recipe.recipeType,
          minecraft: minecraftJson,
        },
      };
    } catch (error) {
      console.error('Error exporting recipe:', error);
      throw new Error(`Failed to export recipe ${recipeId}: ${error}`);
    }
  }

  /**
   * Import a recipe from JSON and save to database
   */
  async importRecipeFromJson(jsonData: any, serverId: number): Promise<RecipeDatapack> {
    try {
      // Extract recipe data from different possible formats
      let recipeData = jsonData;
      let name: string;
      let namespace: string;
      let recipeType: RecipeType;

      // Handle exported format with metadata
      if (jsonData.recipe && jsonData.recipe.minecraft) {
        name = jsonData.recipe.name;
        namespace = jsonData.recipe.namespace;
        recipeType = jsonData.recipe.type as RecipeType;
        recipeData = jsonData.recipe.minecraft;
      } else {
        // Handle raw Minecraft recipe JSON
        const type = jsonData.type?.replace('minecraft:', '');
        recipeType = this.normalizeRecipeType(type);

        // Try to extract name from file or generate one
        name = jsonData.name || `imported_${Date.now()}`;
        namespace = jsonData.namespace || 'custom';
        recipeData = jsonData;
      }

      // Validate the recipe
      const validation = this.validateRecipe(recipeData);
      if (!validation.valid) {
        throw new Error(`Invalid recipe data: ${validation.errors.join(', ')}`);
      }

      // Convert Minecraft JSON back to our storage format
      const storageData = this.minecraftJsonToStorageFormat(recipeData, recipeType);

      // Create and save the recipe entity
      const db = await getDatabase();
      const recipeRepository = db.getRepository(RecipeDatapack);

      const recipe = recipeRepository.create({
        serverId,
        name,
        namespace,
        recipeType,
        recipeData: storageData,
        enabled: true,
      });

      await recipeRepository.save(recipe);

      console.log(`✓ Imported recipe: ${namespace}:${name}`);
      return recipe;
    } catch (error) {
      console.error('Error importing recipe:', error);
      throw new Error(`Failed to import recipe: ${error}`);
    }
  }

  /**
   * Get the datapack base path for a server
   */
  private getDatapackPath(serverId: number): string {
    return path.join(
      process.cwd(),
      'minecraft-data',
      `server-${serverId}`,
      'world',
      'datapacks',
      'custom_recipes'
    );
  }

  /**
   * Get the full path for a recipe file
   */
  private getRecipePath(serverId: number, namespace: string, recipeName: string): string {
    const datapackPath = this.getDatapackPath(serverId);
    return path.join(datapackPath, 'data', namespace, 'recipe', `${recipeName}.json`);
  }

  /**
   * Normalize recipe type string to RecipeType enum
   *
   * Converts various recipe type formats (e.g., "minecraft:smelting", "smelting", "SMELTING")
   * to the standardized RecipeType enum value
   *
   * @param type - The recipe type string to normalize
   * @returns The corresponding RecipeType enum value
   * @throws Error if the recipe type is unknown
   */
  private normalizeRecipeType(type: string): RecipeType {
    const normalized = type.toLowerCase().replace('minecraft:', '');

    const typeMap: { [key: string]: RecipeType } = {
      'crafting_shaped': RecipeType.CRAFTING_SHAPED,
      'crafting_shapeless': RecipeType.CRAFTING_SHAPELESS,
      'smelting': RecipeType.SMELTING,
      'blasting': RecipeType.BLASTING,
      'smoking': RecipeType.SMOKING,
      'campfire_cooking': RecipeType.CAMPFIRE_COOKING,
      'stonecutting': RecipeType.STONECUTTING,
      'smithing': RecipeType.SMITHING_TRANSFORM,
      'smithing_transform': RecipeType.SMITHING_TRANSFORM,
    };

    const recipeType = typeMap[normalized];
    if (!recipeType) {
      throw new Error(`Unknown recipe type: ${type}`);
    }

    return recipeType;
  }

  /**
   * Convert Minecraft recipe JSON to our storage format
   *
   * Takes a Minecraft datapack recipe JSON and converts it to our internal
   * storage format for the database. Handles all recipe types and their
   * specific data structures.
   *
   * @param minecraftJson - The recipe JSON from Minecraft datapack format
   * @param recipeType - The recipe type enum value
   * @returns The recipe data in our storage format
   */
  private minecraftJsonToStorageFormat(minecraftJson: any, recipeType: RecipeType): any {
    const storageData: any = {};

    switch (recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        storageData.pattern = minecraftJson.pattern;
        storageData.key = minecraftJson.key;
        storageData.result = minecraftJson.result;
        if (minecraftJson.group) storageData.group = minecraftJson.group;
        break;

      case RecipeType.CRAFTING_SHAPELESS:
        storageData.ingredients = minecraftJson.ingredients;
        storageData.result = minecraftJson.result;
        if (minecraftJson.group) storageData.group = minecraftJson.group;
        break;

      case RecipeType.SMELTING:
      case RecipeType.BLASTING:
      case RecipeType.SMOKING:
      case RecipeType.CAMPFIRE_COOKING:
        storageData.ingredient = minecraftJson.ingredient;
        storageData.result = minecraftJson.result;
        storageData.experience = minecraftJson.experience ?? 0.1;
        if (recipeType === RecipeType.SMELTING) {
          storageData.cookingtime = minecraftJson.cookingtime ?? 200;
        } else if (recipeType === RecipeType.CAMPFIRE_COOKING) {
          storageData.cookingtime = minecraftJson.cookingtime ?? 600;
        } else {
          storageData.cookingtime = minecraftJson.cookingtime ?? 100;
        }
        if (minecraftJson.group) storageData.group = minecraftJson.group;
        break;

      case RecipeType.STONECUTTING:
        storageData.ingredient = minecraftJson.ingredient;
        storageData.result = minecraftJson.result;
        storageData.count = minecraftJson.count ?? 1;
        if (minecraftJson.group) storageData.group = minecraftJson.group;
        break;

      case RecipeType.SMITHING_TRANSFORM:
        storageData.template = minecraftJson.template;
        storageData.base = minecraftJson.base;
        storageData.addition = minecraftJson.addition;
        storageData.result = minecraftJson.result;
        break;
    }

    return storageData;
  }

  /**
   * Delete all recipes for a server from the datapack folder
   */
  async clearRecipesForServer(serverId: number): Promise<void> {
    try {
      const datapackPath = this.getDatapackPath(serverId);

      // Check if datapack exists
      try {
        await fs.access(datapackPath);
      } catch {
        // Datapack doesn't exist, nothing to clear
        return;
      }

      // Remove the entire datapack directory
      await fs.rm(datapackPath, { recursive: true, force: true });

      console.log(`✓ Cleared all recipes for server ${serverId}`);
    } catch (error) {
      console.error('Error clearing recipes:', error);
      throw new Error(`Failed to clear recipes for server ${serverId}: ${error}`);
    }
  }
}

export default DatapackService.getInstance();
