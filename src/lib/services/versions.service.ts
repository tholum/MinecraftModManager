import axios from 'axios';

export interface MinecraftVersion {
  id: string;
  type: 'release' | 'snapshot';
  url: string;
  time: string;
  releaseTime: string;
}

export interface MinecraftVersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersion[];
}

export interface ModLoaderVersion {
  version: string;
  minecraftVersion: string;
  stable: boolean;
  latest: boolean;
  recommended?: boolean;
}

export class VersionsService {
  private static instance: VersionsService;
  private minecraftVersionsCache: MinecraftVersionManifest | null = null;
  private neoforgeVersionsCache: Map<string, ModLoaderVersion[]> = new Map();
  private fabricVersionsCache: Map<string, ModLoaderVersion[]> = new Map();
  private cacheTimeout = 1000 * 60 * 60; // 1 hour

  private constructor() {}

  static getInstance(): VersionsService {
    if (!VersionsService.instance) {
      VersionsService.instance = new VersionsService();
    }
    return VersionsService.instance;
  }

  async getMinecraftVersions(releaseOnly = true): Promise<MinecraftVersion[]> {
    try {
      if (!this.minecraftVersionsCache) {
        const response = await axios.get<MinecraftVersionManifest>(
          'https://launchermeta.mojang.com/mc/game/version_manifest.json'
        );
        this.minecraftVersionsCache = response.data;

        // Clear cache after timeout
        setTimeout(() => {
          this.minecraftVersionsCache = null;
        }, this.cacheTimeout);
      }

      if (releaseOnly) {
        return this.minecraftVersionsCache.versions.filter(v => v.type === 'release');
      }

      return this.minecraftVersionsCache.versions;
    } catch (error) {
      console.error('Error fetching Minecraft versions:', error);
      throw new Error('Failed to fetch Minecraft versions');
    }
  }

  async getLatestMinecraftVersion(): Promise<string> {
    const versions = await this.getMinecraftVersions(true);
    return versions[0]?.id || '1.21.5';
  }

  async getNeoForgeVersions(minecraftVersion: string): Promise<ModLoaderVersion[]> {
    const cacheKey = `neoforge-${minecraftVersion}`;

    if (this.neoforgeVersionsCache.has(cacheKey)) {
      return this.neoforgeVersionsCache.get(cacheKey)!;
    }

    try {
      // NeoForge API endpoint
      const response = await axios.get(
        `https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge`
      );

      // Filter versions compatible with the Minecraft version
      const versions: ModLoaderVersion[] = response.data.versions
        .filter((v: string) => v.includes(minecraftVersion))
        .map((v: string) => ({
          version: v,
          minecraftVersion: minecraftVersion,
          stable: true,
          latest: false,
        }));

      if (versions.length > 0) {
        versions[0].latest = true;
        versions[0].recommended = true;
      }

      this.neoforgeVersionsCache.set(cacheKey, versions);

      // Clear cache after timeout
      setTimeout(() => {
        this.neoforgeVersionsCache.delete(cacheKey);
      }, this.cacheTimeout);

      return versions;
    } catch (error) {
      console.error('Error fetching NeoForge versions:', error);
      // Return empty array if fetch fails
      return [];
    }
  }

  async getFabricVersions(minecraftVersion: string): Promise<ModLoaderVersion[]> {
    const cacheKey = `fabric-${minecraftVersion}`;

    if (this.fabricVersionsCache.has(cacheKey)) {
      return this.fabricVersionsCache.get(cacheKey)!;
    }

    try {
      // Fabric API endpoint
      const response = await axios.get(
        `https://meta.fabricmc.net/v2/versions/loader/${minecraftVersion}`
      );

      const versions: ModLoaderVersion[] = response.data.map((item: any, index: number) => ({
        version: item.loader.version,
        minecraftVersion: minecraftVersion,
        stable: item.loader.stable,
        latest: index === 0,
        recommended: index === 0 && item.loader.stable,
      }));

      this.fabricVersionsCache.set(cacheKey, versions);

      // Clear cache after timeout
      setTimeout(() => {
        this.fabricVersionsCache.delete(cacheKey);
      }, this.cacheTimeout);

      return versions;
    } catch (error) {
      console.error('Error fetching Fabric versions:', error);
      // Return empty array if fetch fails
      return [];
    }
  }

  async getModLoaderVersions(
    loader: 'neoforge' | 'fabric',
    minecraftVersion: string
  ): Promise<ModLoaderVersion[]> {
    if (loader === 'neoforge') {
      return this.getNeoForgeVersions(minecraftVersion);
    } else {
      return this.getFabricVersions(minecraftVersion);
    }
  }

  async getRecommendedModLoaderVersion(
    loader: 'neoforge' | 'fabric',
    minecraftVersion: string
  ): Promise<string | null> {
    const versions = await this.getModLoaderVersions(loader, minecraftVersion);
    const recommended = versions.find(v => v.recommended);
    return recommended?.version || versions[0]?.version || null;
  }

  clearCache(): void {
    this.minecraftVersionsCache = null;
    this.neoforgeVersionsCache.clear();
    this.fabricVersionsCache.clear();
  }
}

export default VersionsService.getInstance();
