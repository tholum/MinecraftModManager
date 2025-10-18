import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

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
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const containerName = `minecraft-server-${serverId}`;

    // Check if server is running
    const { stdout: psOutput } = await execAsync(`docker ps -q -f name=${containerName}`);
    if (psOutput.trim()) {
      return NextResponse.json(
        { error: 'Server must be stopped before importing a world' },
        { status: 400 }
      );
    }

    // Get uploaded file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    console.log(`Importing world from ${file.name}...`);

    const serverDataDir = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`);
    const worldPath = path.join(serverDataDir, 'world');
    const backupPath = path.join(serverDataDir, `world-backup-${Date.now()}`);
    const tempUploadPath = path.join(serverDataDir, 'temp-world-upload.tar.gz');

    // Create backup of existing world
    try {
      await fs.access(worldPath);
      console.log('Backing up existing world...');
      await fs.rename(worldPath, backupPath);
    } catch {
      console.log('No existing world to backup');
    }

    try {
      // Save uploaded file to temp location
      const bytes = await file.arrayBuffer();
      await fs.writeFile(tempUploadPath, Buffer.from(bytes));

      // Extract the archive
      console.log('Extracting world archive...');
      await execAsync(
        `tar -xzf "${tempUploadPath}" -C "${serverDataDir}"`,
        { timeout: 300000 } // 5 minute timeout
      );

      // Clean up temp file
      await fs.unlink(tempUploadPath);

      // Verify world folder was created
      try {
        await fs.access(worldPath);
      } catch {
        throw new Error('World folder not found in archive');
      }

      // Remove backup on success
      try {
        await fs.rm(backupPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Could not remove backup:', error);
      }

      console.log('World imported successfully');

      return NextResponse.json({
        success: true,
        message: 'World imported successfully. Start the server to use the new world.',
      });
    } catch (error: any) {
      // Restore backup on error
      try {
        await fs.rm(worldPath, { recursive: true, force: true });
        await fs.rename(backupPath, worldPath);
        console.log('Restored backup due to error');
      } catch (restoreError) {
        console.error('Failed to restore backup:', restoreError);
      }

      // Clean up temp file
      try {
        await fs.unlink(tempUploadPath);
      } catch {}

      throw error;
    }
  } catch (error: any) {
    console.error('Error importing world:', error);
    return NextResponse.json(
      { error: 'Failed to import world', details: error.message },
      { status: 500 }
    );
  }
}
