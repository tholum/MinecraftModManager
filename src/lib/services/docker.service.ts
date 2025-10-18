import Docker from 'dockerode';
import { Server, ModLoader, ServerStatus } from '../database/entities';
import path from 'path';
import fs from 'fs/promises';

const docker = new Docker();

export interface ContainerConfig {
  server: Server;
  volumePath: string;
}

export class DockerService {
  private static instance: DockerService;

  private constructor() {}

  static getInstance(): DockerService {
    if (!DockerService.instance) {
      DockerService.instance = new DockerService();
    }
    return DockerService.instance;
  }

  getContainerName(serverId: number): string {
    return `minecraft-server-${serverId}`;
  }

  async getContainer(serverId: number): Promise<Docker.Container | null> {
    const containerName = this.getContainerName(serverId);
    try {
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find((c) =>
        c.Names.some((name) => name === `/${containerName}`)
      );

      if (containerInfo) {
        return docker.getContainer(containerInfo.Id);
      }
      return null;
    } catch (error) {
      console.error('Error getting container:', error);
      return null;
    }
  }

  async createContainer(server: Server): Promise<string> {
    const containerName = this.getContainerName(server.id);
    const volumePath = path.join(process.cwd(), 'minecraft-data', `server-${server.id}`);

    // Ensure volume directory exists
    await fs.mkdir(volumePath, { recursive: true });
    await fs.mkdir(path.join(volumePath, 'world'), { recursive: true });
    await fs.mkdir(path.join(volumePath, 'mods'), { recursive: true });
    await fs.mkdir(path.join(volumePath, 'config'), { recursive: true });

    // Generate server.properties
    await this.generateServerProperties(server, volumePath);

    // Determine the Docker image based on mod loader
    const image = this.getDockerImage(server.modLoader);

    // Pull the image if it doesn't exist locally
    await this.pullImage(image);

    // Create container configuration
    const containerConfig: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: image,
      Env: [
        'EULA=TRUE',
        `VERSION=${server.minecraftVersion}`,
        `TYPE=${this.getServerType(server.modLoader)}`,
        server.modLoaderVersion ? `FORGEVERSION=${server.modLoaderVersion}` : '',
        server.modLoaderVersion ? `FABRIC_VERSION=${server.modLoaderVersion}` : '',
        server.seed ? `SEED=${server.seed}` : '',
        'MEMORY=2G',
        'OVERRIDE_SERVER_PROPERTIES=false',
        'ENABLE_RCON=true',
        'RCON_PASSWORD=minecraft',
        'RCON_PORT=25575',
      ].filter(Boolean),
      ExposedPorts: {
        '25565/tcp': {},
        '25575/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '25565/tcp': [{ HostPort: server.port.toString() }],
          '25575/tcp': [{ HostPort: '25575' }],
        },
        Binds: [
          `${volumePath}:/data`,
        ],
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
    };

    try {
      const container = await docker.createContainer(containerConfig);
      return container.id;
    } catch (error) {
      console.error('Error creating container:', error);
      throw new Error(`Failed to create Docker container: ${error}`);
    }
  }

  async startContainer(serverId: number): Promise<void> {
    const container = await this.getContainer(serverId);
    if (!container) {
      throw new Error(`Container for server ${serverId} not found`);
    }

    try {
      await container.start();
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already started
        return;
      }
      console.error('Error starting container:', error);
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  async stopContainer(serverId: number): Promise<void> {
    const container = await this.getContainer(serverId);
    if (!container) {
      throw new Error(`Container for server ${serverId} not found`);
    }

    try {
      await container.stop({ t: 30 }); // 30 second grace period
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already stopped
        return;
      }
      console.error('Error stopping container:', error);
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  async restartContainer(serverId: number): Promise<void> {
    await this.stopContainer(serverId);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.startContainer(serverId);
  }

  async deleteContainer(serverId: number): Promise<void> {
    const container = await this.getContainer(serverId);
    if (!container) {
      return; // Container doesn't exist, nothing to delete
    }

    try {
      // Stop if running
      try {
        await container.stop({ t: 10 });
      } catch (e) {
        // Already stopped
      }

      // Remove container
      await container.remove();
    } catch (error) {
      console.error('Error deleting container:', error);
      throw new Error(`Failed to delete container: ${error}`);
    }
  }

  async pullImage(imageName: string): Promise<void> {
    try {
      console.log(`Checking if image ${imageName} exists locally...`);

      // Check if image already exists
      const images = await docker.listImages();
      const imageExists = images.some(img =>
        img.RepoTags && img.RepoTags.includes(imageName)
      );

      if (imageExists) {
        console.log(`Image ${imageName} already exists locally`);
        return;
      }

      console.log(`Pulling Docker image: ${imageName}...`);

      return new Promise<void>((resolve, reject) => {
        docker.pull(imageName, (err: any, stream: any) => {
          if (err) {
            console.error('Error pulling image:', err);
            reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
            return;
          }

          docker.modem.followProgress(
            stream,
            (err: any, output: any) => {
              if (err) {
                console.error('Error during image pull:', err);
                reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
              } else {
                console.log(`Successfully pulled image: ${imageName}`);
                resolve();
              }
            },
            (event: any) => {
              // Progress callback - you can log progress here if needed
              if (event.status) {
                console.log(`${event.status}${event.progress ? ': ' + event.progress : ''}`);
              }
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in pullImage:', error);
      throw new Error(`Failed to pull image ${imageName}: ${error}`);
    }
  }

  async getContainerStatus(serverId: number): Promise<ServerStatus> {
    const container = await this.getContainer(serverId);
    if (!container) {
      return ServerStatus.STOPPED;
    }

    try {
      const info = await container.inspect();
      if (info.State.Running) {
        return ServerStatus.RUNNING;
      } else if (info.State.Restarting) {
        return ServerStatus.STARTING;
      } else {
        return ServerStatus.STOPPED;
      }
    } catch (error) {
      console.error('Error getting container status:', error);
      return ServerStatus.ERROR;
    }
  }

  async getContainerLogs(serverId: number, tail: number = 100): Promise<string> {
    const container = await this.getContainer(serverId);
    if (!container) {
      throw new Error(`Container for server ${serverId} not found`);
    }

    try {
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      return logs.toString('utf8');
    } catch (error) {
      console.error('Error getting container logs:', error);
      throw new Error(`Failed to get container logs: ${error}`);
    }
  }

  private getDockerImage(modLoader: ModLoader): string {
    // Using itzg/minecraft-server which supports multiple mod loaders
    return 'itzg/minecraft-server:latest';
  }

  private getServerType(modLoader: ModLoader): string {
    switch (modLoader) {
      case ModLoader.VANILLA:
        return 'VANILLA';
      case ModLoader.NEOFORGE:
        return 'NEOFORGE';
      case ModLoader.FABRIC:
        return 'FABRIC';
      default:
        return 'VANILLA';
    }
  }

  private async generateServerProperties(server: Server, volumePath: string): Promise<void> {
    const settings = server.settings || {};

    const properties = [
      '# Minecraft Server Properties',
      `server-port=${server.port}`,
      `difficulty=${settings.difficulty || 'normal'}`,
      `gamemode=${settings.gamemode || 'survival'}`,
      `max-players=${settings.maxPlayers || 20}`,
      `pvp=${settings.pvp !== false}`,
      `allow-nether=${settings.allowNether !== false}`,
      `allow-flight=${settings.allowFlight || false}`,
      `spawn-monsters=${settings.spawnMonsters !== false}`,
      `spawn-animals=${settings.spawnAnimals !== false}`,
      `spawn-npcs=${settings.spawnNpcs !== false}`,
      `view-distance=${settings.viewDistance || 10}`,
      `simulation-distance=${settings.simulationDistance || 10}`,
      `level-type=${settings.levelType || 'default'}`,
      `motd=${settings.motd || `${server.name} - Managed Server`}`,
      `online-mode=${settings.onlineMode !== false}`,
      `white-list=${settings.whitelist || false}`,
      `enable-command-block=${settings.enableCommandBlock || false}`,
    ];

    const propertiesContent = properties.join('\n');
    await fs.writeFile(
      path.join(volumePath, 'server.properties'),
      propertiesContent,
      'utf8'
    );
  }

  async syncModsFolder(serverId: number, modFiles: string[]): Promise<void> {
    const volumePath = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`, 'mods');

    try {
      // Ensure mods directory exists
      await fs.mkdir(volumePath, { recursive: true });

      // Get current mods in folder
      const currentMods = await fs.readdir(volumePath);

      // Remove mods that shouldn't be there
      for (const mod of currentMods) {
        if (!modFiles.includes(mod)) {
          await fs.unlink(path.join(volumePath, mod));
        }
      }

      // Copy new mods (from central library)
      const modsLibraryPath = path.join(process.cwd(), 'minecraft-data', 'mods-library');
      await fs.mkdir(modsLibraryPath, { recursive: true });

      for (const modFile of modFiles) {
        const sourcePath = path.join(modsLibraryPath, modFile);
        const destPath = path.join(volumePath, modFile);

        try {
          await fs.copyFile(sourcePath, destPath);
        } catch (error) {
          console.error(`Error copying mod ${modFile}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing mods folder:', error);
      throw new Error(`Failed to sync mods folder: ${error}`);
    }
  }

  async syncModsForServer(serverId: number, modVersions: any[]): Promise<void> {
    const volumePath = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`, 'mods');
    const modsLibraryPath = path.join(process.cwd(), 'minecraft-data', 'mods-library');

    try {
      // Ensure directories exist
      await fs.mkdir(volumePath, { recursive: true });
      await fs.mkdir(modsLibraryPath, { recursive: true });

      console.log(`Syncing ${modVersions.length} mods for server ${serverId}...`);

      // Get current mods in server folder
      const currentMods = await fs.readdir(volumePath);
      const expectedFiles = modVersions.map(mv => mv.fileName);

      // Remove mods that shouldn't be there
      for (const mod of currentMods) {
        if (!expectedFiles.includes(mod) && mod.endsWith('.jar')) {
          console.log(`Removing mod: ${mod}`);
          await fs.unlink(path.join(volumePath, mod));
        }
      }

      // Download and copy mods
      for (const modVersion of modVersions) {
        const fileName = modVersion.fileName;
        const libraryPath = path.join(modsLibraryPath, fileName);
        const serverPath = path.join(volumePath, fileName);

        try {
          // Check if file exists in library
          let fileExists = false;
          try {
            await fs.access(libraryPath);
            fileExists = true;
          } catch {
            fileExists = false;
          }

          // Download if not in library and has download URL
          if (!fileExists && modVersion.downloadUrl) {
            console.log(`Downloading ${modVersion.project?.name || fileName} to library...`);
            const response = await fetch(modVersion.downloadUrl);
            if (!response.ok || !response.body) {
              throw new Error(`Failed to download: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await fs.writeFile(libraryPath, buffer);
            console.log(`✓ Downloaded ${fileName}`);
          }

          // Copy to server folder if exists in library
          try {
            await fs.access(libraryPath);
            await fs.copyFile(libraryPath, serverPath);
            console.log(`✓ Synced ${fileName} to server`);
          } catch (error) {
            console.error(`Failed to sync ${fileName}:`, error);
          }
        } catch (error) {
          console.error(`Error processing mod ${fileName}:`, error);
        }
      }

      console.log(`Mod sync complete for server ${serverId}`);
    } catch (error) {
      console.error('Error syncing mods for server:', error);
      throw new Error(`Failed to sync mods: ${error}`);
    }
  }
}

export default DockerService.getInstance();
