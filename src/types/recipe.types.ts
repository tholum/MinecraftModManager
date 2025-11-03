export enum RecipeType {
  CRAFTING_SHAPED = 'minecraft:crafting_shaped',
  CRAFTING_SHAPELESS = 'minecraft:crafting_shapeless',
  SMELTING = 'minecraft:smelting',
  BLASTING = 'minecraft:blasting',
  SMOKING = 'minecraft:smoking',
  CAMPFIRE_COOKING = 'minecraft:campfire_cooking',
  STONECUTTING = 'minecraft:stonecutting',
  SMITHING_TRANSFORM = 'minecraft:smithing_transform',
}

export interface ItemIngredient {
  item: string;
  tag?: string;
}

export interface CraftingShapedData {
  pattern: string[];
  key: Record<string, ItemIngredient>;
  result: {
    item: string;
    count?: number;
  };
}

export interface CraftingShapelessData {
  ingredients: ItemIngredient[];
  result: {
    item: string;
    count?: number;
  };
}

export interface CookingData {
  ingredient: ItemIngredient;
  result: string;
  experience?: number;
  cookingtime?: number;
}

export interface StonecuttingData {
  ingredient: ItemIngredient;
  result: string;
  count?: number;
}

export interface SmithingTransformData {
  template: ItemIngredient;
  base: ItemIngredient;
  addition: ItemIngredient;
  result: {
    item: string;
  };
}

export type RecipeData =
  | CraftingShapedData
  | CraftingShapelessData
  | CookingData
  | StonecuttingData
  | SmithingTransformData;

export interface Recipe {
  id: number;
  serverId: number;
  name: string;
  namespace: string;
  type: RecipeType;
  data: RecipeData;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MinecraftItem {
  id: string;
  name: string;
  displayName: string;
  stackSize: number;
  iconUrl?: string;
}
