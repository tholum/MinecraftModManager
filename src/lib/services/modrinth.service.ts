import axios from 'axios';

const MODRINTH_API = 'https://api.modrinth.com/v2';

export interface ModrinthSearchResult {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  client_side: string;
  server_side: string;
  project_type: string;
  downloads: number;
  icon_url: string;
  project_id: string;
  author: string;
  versions: string[];
  follows: number;
  date_created: string;
  date_modified: string;
  latest_version: string;
  license: string;
  gallery: string[];
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  author_id: string;
  featured: boolean;
  name: string;
  version_number: string;
  changelog: string;
  dependencies: any[];
  game_versions: string[];
  version_type: string;
  loaders: string[];
  featured: boolean;
  status: string;
  requested_status: string;
  files: {
    hashes: {
      sha512: string;
      sha1: string;
    };
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    file_type: string;
  }[];
  date_published: string;
  downloads: number;
}

export interface ModrinthProject {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  client_side: string;
  server_side: string;
  body: string;
  issues_url: string;
  source_url: string;
  wiki_url: string;
  discord_url: string;
  donation_urls: any[];
  project_type: string;
  downloads: number;
  icon_url: string;
  id: string;
  team: string;
  published: string;
  updated: string;
  approved: string;
  followers: number;
  status: string;
  license: {
    id: string;
    name: string;
    url: string;
  };
  versions: string[];
  game_versions: string[];
  loaders: string[];
}

export class ModrinthService {
  private static instance: ModrinthService;

  private constructor() {}

  static getInstance(): ModrinthService {
    if (!ModrinthService.instance) {
      ModrinthService.instance = new ModrinthService();
    }
    return ModrinthService.instance;
  }

  /**
   * Search for mods on Modrinth
   */
  async searchMods(
    query: string,
    minecraftVersion?: string,
    modLoader?: string,
    limit: number = 20
  ): Promise<{ hits: ModrinthSearchResult[]; offset: number; limit: number; total_hits: number }> {
    try {
      const facets: string[][] = [['project_type:mod']];

      if (minecraftVersion) {
        facets.push([`versions:${minecraftVersion}`]);
      }

      if (modLoader && modLoader !== 'vanilla') {
        facets.push([`categories:${modLoader}`]);
      }

      const facetsParam = encodeURIComponent(JSON.stringify(facets));
      const queryParam = encodeURIComponent(query);

      const url = `${MODRINTH_API}/search?query=${queryParam}&limit=${limit}&index=relevance&facets=${facetsParam}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'minecraft-server-manager/1.0.0',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error searching Modrinth:', error);
      throw new Error('Failed to search Modrinth');
    }
  }

  /**
   * Get detailed information about a specific mod
   */
  async getProject(projectId: string): Promise<ModrinthProject> {
    try {
      const response = await axios.get(`${MODRINTH_API}/project/${projectId}`, {
        headers: {
          'User-Agent': 'minecraft-server-manager/1.0.0',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Modrinth project:', error);
      throw new Error('Failed to fetch project details');
    }
  }

  /**
   * Get versions for a specific mod
   */
  async getProjectVersions(
    projectId: string,
    minecraftVersion?: string,
    modLoader?: string
  ): Promise<ModrinthVersion[]> {
    try {
      let url = `${MODRINTH_API}/project/${projectId}/version`;
      const params = new URLSearchParams();

      if (minecraftVersion) {
        params.append('game_versions', JSON.stringify([minecraftVersion]));
      }

      if (modLoader && modLoader !== 'vanilla') {
        params.append('loaders', JSON.stringify([modLoader]));
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'minecraft-server-manager/1.0.0',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Modrinth versions:', error);
      throw new Error('Failed to fetch mod versions');
    }
  }

  /**
   * Download a mod file
   */
  async downloadModFile(url: string, filename: string, destinationPath: string): Promise<void> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'minecraft-server-manager/1.0.0',
        },
      });

      const fs = require('fs/promises');
      await fs.writeFile(destinationPath, response.data);
    } catch (error) {
      console.error('Error downloading mod file:', error);
      throw new Error('Failed to download mod file');
    }
  }
}

export default ModrinthService.getInstance();
