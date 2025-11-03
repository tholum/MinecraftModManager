import minecraftData from 'minecraft-data';

// Type definition for Minecraft item
export interface MinecraftItem {
  id: string;
  name: string;
  displayName: string;
  stackSize: number;
}

// Type definition for raw minecraft-data item
interface RawMinecraftItem {
  id: number;
  name: string;
  displayName: string;
  stackSize: number;
}

export class MinecraftItemsService {
  private static instance: MinecraftItemsService;
  private itemsCache: Map<string, MinecraftItem[]> = new Map();
  private cacheTimeout = 1000 * 60 * 60; // 1 hour

  private constructor() {}

  static getInstance(): MinecraftItemsService {
    if (!MinecraftItemsService.instance) {
      MinecraftItemsService.instance = new MinecraftItemsService();
    }
    return MinecraftItemsService.instance;
  }

  /**
   * Get Minecraft items for a specific version
   * @param version Minecraft version (e.g., '1.21', '1.20.1')
   * @returns Array of Minecraft items
   */
  getItems(version: string): MinecraftItem[] {
    // Check if items are cached for this version
    if (this.itemsCache.has(version)) {
      return this.itemsCache.get(version)!;
    }

    try {
      // Load minecraft-data for the specified version
      const mcData = minecraftData(version);

      // Transform items to our format
      const items = mcData.itemsArray.map((item: RawMinecraftItem) => ({
        id: `minecraft:${item.name}`,
        name: item.name,
        displayName: item.displayName,
        stackSize: item.stackSize,
      }));

      // Cache the items
      this.itemsCache.set(version, items);

      // Clear cache after timeout
      setTimeout(() => {
        this.itemsCache.delete(version);
      }, this.cacheTimeout);

      return items;
    } catch (error) {
      console.error(`Error loading minecraft-data for version ${version}:`, error);
      throw new Error(`Failed to load Minecraft item data for version ${version}`);
    }
  }

  /**
   * Clear all cached item data
   */
  clearCache(): void {
    this.itemsCache.clear();
  }
}

export default MinecraftItemsService.getInstance();
