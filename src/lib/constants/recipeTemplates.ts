import { RecipeType } from '@/types/recipe.types';

export interface RecipeTemplate {
  id: string;
  name: string;
  description: string;
  recipeType: RecipeType;
  template: {
    name: string;
    namespace: string;
    recipeData: any;
    enabled: boolean;
  };
}

export const recipeTemplates: RecipeTemplate[] = [
  // ==================== CRAFTING SHAPED ====================
  {
    id: 'crafting_shaped_3x3',
    name: '3x3 Full Grid',
    description: 'A shaped recipe that uses all 9 crafting slots',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_3x3_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['AAA', 'AAA', 'AAA'],
        key: {
          A: 'minecraft:dirt',
        },
        result: { id: 'minecraft:diamond', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_2x2',
    name: '2x2 Block Pattern',
    description: 'Compact recipe in top-left 2x2 area',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_2x2_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['AA', 'AA'],
        key: {
          A: 'minecraft:planks',
        },
        result: { id: 'minecraft:crafting_table', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_tool',
    name: 'Tool/Weapon Pattern',
    description: 'Vertical stick handle pattern for tools and weapons',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_tool_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['  M', '  S', '  S'],
        key: {
          M: { item: 'minecraft:diamond' },
          S: { item: 'minecraft:stick' },
        },
        result: { item: 'minecraft:diamond_shovel', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_helmet',
    name: 'Helmet Armor Pattern',
    description: 'Standard helmet crafting pattern',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_helmet_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['AAA', 'A A'],
        key: {
          A: { item: 'minecraft:iron_ingot' },
        },
        result: { item: 'minecraft:iron_helmet', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_chestplate',
    name: 'Chestplate Armor Pattern',
    description: 'Standard chestplate crafting pattern',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_chestplate_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['A A', 'AAA', 'AAA'],
        key: {
          A: { item: 'minecraft:iron_ingot' },
        },
        result: { item: 'minecraft:iron_chestplate', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_leggings',
    name: 'Leggings Armor Pattern',
    description: 'Standard leggings crafting pattern',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_leggings_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['AAA', 'A A', 'A A'],
        key: {
          A: { item: 'minecraft:iron_ingot' },
        },
        result: { item: 'minecraft:iron_leggings', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shaped_boots',
    name: 'Boots Armor Pattern',
    description: 'Standard boots crafting pattern',
    recipeType: RecipeType.CRAFTING_SHAPED,
    template: {
      name: 'my_boots_recipe',
      namespace: 'custom',
      recipeData: {
        pattern: ['A A', 'A A'],
        key: {
          A: { item: 'minecraft:iron_ingot' },
        },
        result: { item: 'minecraft:iron_boots', count: 1 },
      },
      enabled: true,
    },
  },

  // ==================== CRAFTING SHAPELESS ====================
  {
    id: 'crafting_shapeless_simple',
    name: 'Simple Conversion',
    description: 'Convert one ingredient into a result',
    recipeType: RecipeType.CRAFTING_SHAPELESS,
    template: {
      name: 'my_conversion_recipe',
      namespace: 'custom',
      recipeData: {
        ingredients: [{ item: 'minecraft:dirt' }],
        result: { item: 'minecraft:grass_block', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shapeless_multi',
    name: 'Multi-ingredient Mix',
    description: 'Combine multiple items into one result',
    recipeType: RecipeType.CRAFTING_SHAPELESS,
    template: {
      name: 'my_mix_recipe',
      namespace: 'custom',
      recipeData: {
        ingredients: [
          { item: 'minecraft:sugar' },
          { item: 'minecraft:egg' },
          { item: 'minecraft:wheat' },
          { item: 'minecraft:milk_bucket' },
        ],
        result: { item: 'minecraft:cake', count: 1 },
      },
      enabled: true,
    },
  },
  {
    id: 'crafting_shapeless_dye',
    name: 'Dye Combination',
    description: 'Mix dyes to create new colors',
    recipeType: RecipeType.CRAFTING_SHAPELESS,
    template: {
      name: 'my_dye_recipe',
      namespace: 'custom',
      recipeData: {
        ingredients: [
          { item: 'minecraft:red_dye' },
          { item: 'minecraft:blue_dye' },
        ],
        result: { item: 'minecraft:purple_dye', count: 2 },
      },
      enabled: true,
    },
  },

  // ==================== SMELTING ====================
  {
    id: 'smelting_basic',
    name: 'Basic Smelting',
    description: 'Standard furnace recipe for smelting ores or cooking food',
    recipeType: RecipeType.SMELTING,
    template: {
      name: 'my_smelting_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:iron_ore' },
        result: 'minecraft:iron_ingot',
        experience: 0.7,
        cookingtime: 200,
      },
      enabled: true,
    },
  },
  {
    id: 'smelting_recycling',
    name: 'Item Recycling',
    description: 'Smelt items to recover materials (e.g., iron tools to nuggets)',
    recipeType: RecipeType.SMELTING,
    template: {
      name: 'my_recycling_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:iron_sword' },
        result: 'minecraft:iron_nugget',
        experience: 0.1,
        cookingtime: 200,
      },
      enabled: true,
    },
  },

  // ==================== BLASTING ====================
  {
    id: 'blasting_fast',
    name: 'Fast Smelting',
    description: 'Blast furnace recipe for ore processing (2x faster)',
    recipeType: RecipeType.BLASTING,
    template: {
      name: 'my_blasting_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:iron_ore' },
        result: 'minecraft:iron_ingot',
        experience: 0.7,
        cookingtime: 100,
      },
      enabled: true,
    },
  },
  {
    id: 'blasting_ancient_debris',
    name: 'Ancient Debris Processing',
    description: 'Blast ancient debris to create netherite scrap',
    recipeType: RecipeType.BLASTING,
    template: {
      name: 'my_ancient_debris_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:ancient_debris' },
        result: 'minecraft:netherite_scrap',
        experience: 2.0,
        cookingtime: 100,
      },
      enabled: true,
    },
  },

  // ==================== SMOKING ====================
  {
    id: 'smoking_food',
    name: 'Cooking Food',
    description: 'Smoker recipe for cooking food (2x faster)',
    recipeType: RecipeType.SMOKING,
    template: {
      name: 'my_smoking_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:porkchop' },
        result: 'minecraft:cooked_porkchop',
        experience: 0.35,
        cookingtime: 100,
      },
      enabled: true,
    },
  },
  {
    id: 'smoking_fish',
    name: 'Fish Cooking',
    description: 'Smoke fish for cooking',
    recipeType: RecipeType.SMOKING,
    template: {
      name: 'my_fish_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:salmon' },
        result: 'minecraft:cooked_salmon',
        experience: 0.35,
        cookingtime: 100,
      },
      enabled: true,
    },
  },

  // ==================== CAMPFIRE COOKING ====================
  {
    id: 'campfire_basic',
    name: 'Campfire Cooking',
    description: 'Cook food over a campfire (slow but no fuel needed)',
    recipeType: RecipeType.CAMPFIRE_COOKING,
    template: {
      name: 'my_campfire_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:beef' },
        result: 'minecraft:cooked_beef',
        experience: 0.35,
        cookingtime: 600,
      },
      enabled: true,
    },
  },

  // ==================== STONECUTTING ====================
  {
    id: 'stonecutting_variants',
    name: 'Block Variants',
    description: 'Cut blocks into different variants (slabs, stairs, walls)',
    recipeType: RecipeType.STONECUTTING,
    template: {
      name: 'my_stonecutting_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:stone' },
        result: 'minecraft:stone_slab',
        count: 2,
      },
      enabled: true,
    },
  },
  {
    id: 'stonecutting_stairs',
    name: 'Stairs Cutting',
    description: 'Cut blocks into stairs',
    recipeType: RecipeType.STONECUTTING,
    template: {
      name: 'my_stairs_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:stone' },
        result: 'minecraft:stone_stairs',
        count: 1,
      },
      enabled: true,
    },
  },
  {
    id: 'stonecutting_wall',
    name: 'Wall Cutting',
    description: 'Cut blocks into walls',
    recipeType: RecipeType.STONECUTTING,
    template: {
      name: 'my_wall_recipe',
      namespace: 'custom',
      recipeData: {
        ingredient: { item: 'minecraft:stone' },
        result: 'minecraft:cobblestone_wall',
        count: 1,
      },
      enabled: true,
    },
  },

  // ==================== SMITHING TRANSFORM ====================
  {
    id: 'smithing_upgrade',
    name: 'Upgrade Item',
    description: 'Upgrade an item using the smithing table (e.g., diamond to netherite)',
    recipeType: RecipeType.SMITHING_TRANSFORM,
    template: {
      name: 'my_smithing_recipe',
      namespace: 'custom',
      recipeData: {
        template: { item: 'minecraft:netherite_upgrade_smithing_template' },
        base: { item: 'minecraft:diamond_sword' },
        addition: { item: 'minecraft:netherite_ingot' },
        result: { item: 'minecraft:netherite_sword' },
      },
      enabled: true,
    },
  },
  {
    id: 'smithing_armor_trim',
    name: 'Armor Trim Application',
    description: 'Apply armor trim to equipment',
    recipeType: RecipeType.SMITHING_TRANSFORM,
    template: {
      name: 'my_armor_trim_recipe',
      namespace: 'custom',
      recipeData: {
        template: { item: 'minecraft:coast_armor_trim_smithing_template' },
        base: { item: 'minecraft:iron_chestplate' },
        addition: { item: 'minecraft:emerald' },
        result: { item: 'minecraft:iron_chestplate' },
      },
      enabled: true,
    },
  },
];

/**
 * Get templates filtered by recipe type
 */
export function getTemplatesByType(recipeType: RecipeType): RecipeTemplate[] {
  return recipeTemplates.filter((template) => template.recipeType === recipeType);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): RecipeTemplate | undefined {
  return recipeTemplates.find((template) => template.id === id);
}
