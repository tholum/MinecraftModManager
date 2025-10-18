import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const execAsync = promisify(exec);

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const fileStream = require('fs').createWriteStream(destPath);
  await finished(Readable.fromWeb(response.body as any).pipe(fileStream));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: serverId },
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const containerName = `minecraft-server-${serverId}`;
    const tempDir = path.join('/tmp', `mods-deploy-${serverId}`);

    // Create temp directory for downloading mods
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Get enabled mods
      const enabledMods = server.serverMods.filter(sm => sm.enabled);

      console.log(`Deploying ${enabledMods.length} mods to server ${server.name}...`);

      const deployed = [];
      const failed = [];

      // Download each mod
      for (const serverMod of enabledMods) {
        const modVersion = serverMod.modVersion;
        const fileName = modVersion.fileName;
        const tempFilePath = path.join(tempDir, fileName);

        try {
          console.log(`Downloading ${modVersion.project.name}...`);

          if (!modVersion.downloadUrl) {
            throw new Error('No download URL available');
          }

          // Download the mod file
          await downloadFile(modVersion.downloadUrl, tempFilePath);

          // Copy to container
          await execAsync(`docker cp "${tempFilePath}" ${containerName}:/data/mods/${fileName}`);

          deployed.push({
            modName: modVersion.project.name,
            fileName,
          });

          console.log(`✓ Deployed ${modVersion.project.name}`);
        } catch (error: any) {
          console.error(`Failed to deploy ${modVersion.project.name}:`, error);
          failed.push({
            modName: modVersion.project.name,
            fileName,
            error: error.message,
          });
        }
      }

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      // Check container status before restarting
      try {
        const { stdout } = await execAsync(`docker ps -q -f name=${containerName}`);
        const isRunning = stdout.trim().length > 0;

        if (isRunning) {
          console.log('Restarting server to load new mods...');
          await execAsync(`docker restart ${containerName}`);
        } else {
          console.log('Server is not running - skipping restart');
        }
      } catch (restartError) {
        console.error('Error restarting server:', restartError);
      }

      return NextResponse.json({
        success: true,
        deployed,
        failed,
        deployedCount: deployed.length,
        failedCount: failed.length,
      });
    } catch (error) {
      // Clean up on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('Error deploying mods:', error);
    return NextResponse.json(
      { error: 'Failed to deploy mods', details: error.message },
      { status: 500 }
    );
  }
}
