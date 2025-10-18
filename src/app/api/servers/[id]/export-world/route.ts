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
    const worldPath = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`, 'world');
    const exportsDir = path.join(process.cwd(), 'minecraft-data', 'exports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFileName = `${server.name.replace(/[^a-z0-9]/gi, '-')}-world-${timestamp}.tar.gz`;
    const exportPath = path.join(exportsDir, exportFileName);

    // Ensure exports directory exists
    await fs.mkdir(exportsDir, { recursive: true });

    // Check if server is running - if so, save the world first
    const { stdout: psOutput } = await execAsync(`docker ps -q -f name=${containerName}`);
    if (psOutput.trim()) {
      console.log('Server is running, saving world...');
      try {
        await execAsync(`docker exec ${containerName} rcon-cli save-all`);
        // Wait a bit for save to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn('Could not save world via RCON, continuing anyway:', error);
      }
    }

    // Create tar.gz archive of the world folder
    console.log(`Creating world export: ${exportFileName}`);
    const worldDir = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`);

    await execAsync(
      `tar -czf "${exportPath}" -C "${worldDir}" world`,
      { timeout: 300000 } // 5 minute timeout
    );

    // Get file size
    const stats = await fs.stat(exportPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`World exported successfully: ${fileSizeMB}MB`);

    return NextResponse.json({
      success: true,
      fileName: exportFileName,
      filePath: `/api/servers/${serverId}/download-export/${exportFileName}`,
      fileSize: fileSizeMB,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error exporting world:', error);
    return NextResponse.json(
      { error: 'Failed to export world', details: error.message },
      { status: 500 }
    );
  }
}
