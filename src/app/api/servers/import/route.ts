import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerStatus, ModLoader, ModProject, ModVersion, ServerMod } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Get uploaded file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const portStr = formData.get('port') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is a tar.gz
    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
      return NextResponse.json(
        { error: 'File must be a .tar.gz or .tgz archive' },
        { status: 400 }
      );
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1024 || port > 65535) {
      return NextResponse.json(
        { error: 'Invalid port number' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    // Check if port is already in use
    const existingServer = await serverRepository.findOne({
      where: { port },
    });

    if (existingServer) {
      return NextResponse.json(
        { error: 'Port is already in use' },
        { status: 400 }
      );
    }

    console.log(`Importing server from ${file.name}...`);

    const tempDir = path.join(process.cwd(), 'minecraft-data', `temp-import-${Date.now()}`);
    const tempArchivePath = path.join(tempDir, 'import.tar.gz');

    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Save uploaded file to temp location
      const bytes = await file.arrayBuffer();
      await fs.writeFile(tempArchivePath, Buffer.from(bytes));

      // Extract the archive
      console.log('Extracting server archive...');
      await execAsync(
        `tar -xzf "${tempArchivePath}" -C "${tempDir}"`,
        { timeout: 300000 } // 5 minute timeout
      );

      // Read metadata
      const metadataPath = path.join(tempDir, 'export-metadata.json');
      let metadata: any;

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid or missing metadata in export file' },
          { status: 400 }
        );
      }

      // Verify required folders exist
      const worldPath = path.join(tempDir, 'world');
      try {
        await fs.access(worldPath);
      } catch {
        throw new Error('World folder not found in archive');
      }

      // Create server entity
      const server = serverRepository.create({
        name: metadata.serverName || 'Imported Server',
        port,
        minecraftVersion: metadata.minecraftVersion,
        modLoader: metadata.modLoader as ModLoader || ModLoader.VANILLA,
        modLoaderVersion: metadata.modLoaderVersion,
        seed: metadata.seed,
        settings: metadata.settings || {},
        status: ServerStatus.STOPPED,
      });

      const savedServer = await serverRepository.save(server);

      // Move extracted data to server directory
      const serverDataDir = path.join(process.cwd(), 'minecraft-data', `server-${savedServer.id}`);
      await fs.mkdir(serverDataDir, { recursive: true });

      // Move all extracted content
      const itemsToMove = ['world', 'config', 'mods', 'server.properties'];
      for (const item of itemsToMove) {
        const sourcePath = path.join(tempDir, item);
        const destPath = path.join(serverDataDir, item);

        try {
          await fs.access(sourcePath);
          await execAsync(`mv "${sourcePath}" "${destPath}"`);
          console.log(`Moved ${item}`);
        } catch {
          console.log(`${item} not found in archive, skipping`);
        }
      }

      // Scan and import mods to the library
      const modsDir = path.join(serverDataDir, 'mods');
      let importedModsCount = 0;

      try {
        await fs.access(modsDir);
        const modFiles = await fs.readdir(modsDir);
        const jarFiles = modFiles.filter(f => f.endsWith('.jar'));

        console.log(`Found ${jarFiles.length} mod files, importing to library...`);

        const modProjectRepository = db.getRepository(ModProject);
        const modVersionRepository = db.getRepository(ModVersion);
        const serverModRepository = db.getRepository(ServerMod);

        for (const fileName of jarFiles) {
          try {
            const filePath = path.join(modsDir, fileName);
            const fileStats = await fs.stat(filePath);
            const fileBuffer = await fs.readFile(filePath);
            const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

            // Check if this mod version already exists by SHA1
            let modVersion = await modVersionRepository.findOne({
              where: { sha1 },
              relations: ['project'],
            });

            if (!modVersion) {
              // Extract mod name from filename (basic heuristic)
              const modName = fileName
                .replace(/\.jar$/, '')
                .replace(/[-_]\d+.*$/, '') // Remove version numbers
                .replace(/[_-]/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              // Check if project exists by name
              let modProject = await modProjectRepository.findOne({
                where: { name: modName },
              });

              if (!modProject) {
                // Create new project
                modProject = modProjectRepository.create({
                  name: modName,
                  source: 'manual',
                  autoUpdate: false,
                });
                modProject = await modProjectRepository.save(modProject);
                console.log(`Created new mod project: ${modName}`);
              }

              // Create new version
              modVersion = modVersionRepository.create({
                projectId: modProject.id,
                fileName,
                versionNumber: 'imported',
                modLoader: metadata.modLoader || 'neoforge',
                minecraftVersions: [metadata.minecraftVersion],
                fileSize: fileStats.size,
                sha1,
              });
              modVersion = await modVersionRepository.save(modVersion);
              console.log(`Imported mod version: ${fileName}`);
              importedModsCount++;
            }

            // Link mod to server
            const existingServerMod = await serverModRepository.findOne({
              where: {
                serverId: savedServer.id,
                modVersionId: modVersion.id,
              },
            });

            if (!existingServerMod) {
              const serverMod = serverModRepository.create({
                serverId: savedServer.id,
                modVersionId: modVersion.id,
                enabled: true,
              });
              await serverModRepository.save(serverMod);
            }
          } catch (modError) {
            console.error(`Error importing mod ${fileName}:`, modError);
          }
        }

        console.log(`Imported ${importedModsCount} new mods to library`);
      } catch (error) {
        console.log('No mods folder found or error scanning mods:', error);
      }

      // Create Docker container
      try {
        const containerId = await dockerService.createContainer(savedServer);
        savedServer.dockerContainerId = containerId;
        await serverRepository.save(savedServer);
      } catch (dockerError) {
        console.error('Error creating Docker container:', dockerError);
        // Clean up server data
        await fs.rm(serverDataDir, { recursive: true, force: true });
        await serverRepository.remove(savedServer);

        return NextResponse.json(
          { error: 'Failed to create Docker container' },
          { status: 500 }
        );
      }

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      console.log(`Server imported successfully: ${savedServer.name} (ID: ${savedServer.id})`);

      return NextResponse.json({
        success: true,
        server: savedServer,
        message: `Server imported successfully. ${importedModsCount > 0 ? `${importedModsCount} new mods added to library.` : ''}`,
        importedModsCount,
      }, { status: 201 });
    } catch (error: any) {
      // Clean up temp directory on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('Error importing server:', error);
    return NextResponse.json(
      { error: 'Failed to import server', details: error.message },
      { status: 500 }
    );
  }
}
