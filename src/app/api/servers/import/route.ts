import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerStatus, ModLoader } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

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
        message: 'Server imported successfully',
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
