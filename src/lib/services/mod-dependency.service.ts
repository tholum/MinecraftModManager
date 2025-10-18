import { getDatabase } from '@/lib/database/config';
import { ModProject, ModVersion } from '@/lib/database/entities';

interface ModrinthDependency {
  version_id?: string;
  project_id?: string;
  file_name?: string;
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
}

interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  files: Array<{
    url: string;
    filename: string;
    primary: boolean;
  }>;
  dependencies: ModrinthDependency[];
  game_versions: string[];
  loaders: string[];
}

interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  icon_url?: string;
}

interface DependencyResolution {
  modVersionId: number;
  reason: string;
  depth: number;
}

class ModDependencyService {
  private async fetchModrinthVersion(versionId: string): Promise<ModrinthVersion | null> {
    try {
      const response = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching Modrinth version:', error);
      return null;
    }
  }

  private async fetchModrinthProject(projectId: string): Promise<ModrinthProject | null> {
    try {
      const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching Modrinth project:', error);
      return null;
    }
  }

  private async fetchModrinthVersionsByProject(
    projectId: string,
    minecraftVersion: string,
    modLoader: string
  ): Promise<ModrinthVersion[]> {
    try {
      const loaders = JSON.stringify([modLoader.toLowerCase()]);
      const gameVersions = JSON.stringify([minecraftVersion]);

      const response = await fetch(
        `https://api.modrinth.com/v2/project/${projectId}/version?loaders=${loaders}&game_versions=${gameVersions}`
      );

      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching versions for project:', error);
      return [];
    }
  }

  private async findOrCreateModProject(modrinthProjectId: string): Promise<ModProject | null> {
    const db = await getDatabase();
    const projectRepository = db.getRepository(ModProject);

    // Check if project already exists
    let project = await projectRepository.findOne({
      where: { modrinthId: modrinthProjectId },
    });

    if (!project) {
      // Fetch project info from Modrinth and create it
      const modrinthProject = await this.fetchModrinthProject(modrinthProjectId);
      if (!modrinthProject) return null;

      project = projectRepository.create({
        name: modrinthProject.title,
        modrinthId: modrinthProject.id,
        slug: modrinthProject.slug,
        iconUrl: modrinthProject.icon_url,
      });

      project = await projectRepository.save(project);
    }

    return project;
  }

  private async findOrCreateModVersion(
    modrinthVersionId: string,
    project: ModProject
  ): Promise<ModVersion | null> {
    const db = await getDatabase();
    const versionRepository = db.getRepository(ModVersion);

    // Check if version already exists
    let version = await versionRepository.findOne({
      where: { modrinthVersionId: modrinthVersionId },
      relations: ['project'],
    });

    if (!version) {
      // Fetch version info from Modrinth and create it
      const modrinthVersion = await this.fetchModrinthVersion(modrinthVersionId);
      if (!modrinthVersion) return null;

      const primaryFile = modrinthVersion.files.find(f => f.primary) || modrinthVersion.files[0];
      if (!primaryFile) return null;

      version = versionRepository.create({
        projectId: project.id,
        modrinthVersionId: modrinthVersion.id,
        versionNumber: modrinthVersion.version_number,
        fileName: primaryFile.filename,
        downloadUrl: primaryFile.url,
        modLoader: modrinthVersion.loaders[0] || 'unknown',
        minecraftVersions: modrinthVersion.game_versions,
      });

      version = await versionRepository.save(version);
      version.project = project;
    }

    return version;
  }

  /**
   * Resolves all dependencies for a given mod version
   * Returns a map of modVersionId -> dependency info
   */
  async resolveDependencies(
    modVersionId: number,
    minecraftVersion: string,
    modLoader: string,
    maxDepth: number = 10
  ): Promise<Map<number, DependencyResolution>> {
    const db = await getDatabase();
    const versionRepository = db.getRepository(ModVersion);

    const dependencies = new Map<number, DependencyResolution>();
    const visited = new Set<string>(); // Track visited Modrinth version IDs to avoid cycles

    const resolveRecursive = async (
      versionId: number,
      reason: string,
      depth: number
    ): Promise<void> => {
      if (depth > maxDepth) {
        console.warn('Max dependency depth reached');
        return;
      }

      // Get the mod version from database
      const modVersion = await versionRepository.findOne({
        where: { id: versionId },
        relations: ['project'],
      });

      if (!modVersion || !modVersion.modrinthVersionId) return;
      if (visited.has(modVersion.modrinthVersionId)) return;

      visited.add(modVersion.modrinthVersionId);

      // Fetch dependencies from Modrinth
      const modrinthVersion = await this.fetchModrinthVersion(modVersion.modrinthVersionId);
      if (!modrinthVersion) return;

      // Process only required dependencies
      const requiredDeps = modrinthVersion.dependencies.filter(
        dep => dep.dependency_type === 'required'
      );

      for (const dep of requiredDeps) {
        if (!dep.project_id) continue;

        // Skip common dependencies that are usually provided by the mod loader
        const skipProjects = ['fabric-api', 'forge', 'neoforge'];
        if (skipProjects.some(skip => dep.project_id?.includes(skip))) {
          continue;
        }

        // Find or create the project
        const depProject = await this.findOrCreateModProject(dep.project_id);
        if (!depProject) continue;

        let depModVersion: ModVersion | null = null;

        // If we have a specific version ID, use it
        if (dep.version_id) {
          depModVersion = await this.findOrCreateModVersion(dep.version_id, depProject);
        } else {
          // Otherwise, find a compatible version
          const compatibleVersions = await this.fetchModrinthVersionsByProject(
            dep.project_id,
            minecraftVersion,
            modLoader
          );

          if (compatibleVersions.length > 0) {
            // Use the first (latest) compatible version
            depModVersion = await this.findOrCreateModVersion(
              compatibleVersions[0].id,
              depProject
            );
          }
        }

        if (depModVersion) {
          // Add to dependencies map
          dependencies.set(depModVersion.id, {
            modVersionId: depModVersion.id,
            reason: `Required by ${modVersion.project.name}`,
            depth,
          });

          // Recursively resolve dependencies of this dependency
          await resolveRecursive(depModVersion.id, `Required by ${depProject.name}`, depth + 1);
        }
      }
    };

    // Start recursive resolution
    await resolveRecursive(modVersionId, 'Direct dependency', 0);

    return dependencies;
  }

  /**
   * Check all mods on a server and resolve missing dependencies
   */
  async checkServerDependencies(
    serverId: number,
    minecraftVersion: string,
    modLoader: string
  ): Promise<Map<number, DependencyResolution>> {
    const db = await getDatabase();
    const { Server } = require('@/lib/database/entities');
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: serverId },
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const allDependencies = new Map<number, DependencyResolution>();
    const installedModVersionIds = new Set(
      server.serverMods.map((sm: any) => sm.modVersionId)
    );

    // Check each installed mod
    for (const serverMod of server.serverMods) {
      const deps = await this.resolveDependencies(
        serverMod.modVersionId,
        minecraftVersion,
        modLoader
      );

      // Add dependencies that aren't already installed
      for (const [depId, depInfo] of deps.entries()) {
        if (!installedModVersionIds.has(depId) && !allDependencies.has(depId)) {
          allDependencies.set(depId, depInfo);
        }
      }
    }

    return allDependencies;
  }
}

export default new ModDependencyService();
