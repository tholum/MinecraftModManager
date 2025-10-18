import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import { exec } from 'child_process';
import { promisify } from 'util';

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

    // Detect mod loader version from Docker container
    let detectedVersion = null;

    try {
      const containerName = `minecraft-server-${serverId}`;

      if (server.modLoader === 'neoforge') {
        // Find NeoForge version
        const { stdout } = await execAsync(
          `docker exec ${containerName} find /data/libraries/net/neoforged/neoforge -maxdepth 1 -type d -name "[0-9]*" 2>/dev/null | head -1`
        );
        const versionPath = stdout.trim();
        if (versionPath) {
          detectedVersion = versionPath.split('/').pop();
        }
      } else if (server.modLoader === 'fabric') {
        // Find Fabric version
        const { stdout } = await execAsync(
          `docker exec ${containerName} find /data/.fabric -name "fabric-loader-*.jar" 2>/dev/null | head -1`
        );
        const jarFile = stdout.trim();
        if (jarFile) {
          const match = jarFile.match(/fabric-loader-(\d+\.\d+\.\d+)/);
          if (match) {
            detectedVersion = match[1];
          }
        }
      }
    } catch (error) {
      console.error('Error detecting version:', error);
    }

    if (detectedVersion) {
      server.modLoaderVersion = detectedVersion;
      await serverRepository.save(server);

      return NextResponse.json({
        success: true,
        version: detectedVersion,
        message: `Detected and updated ${server.modLoader} version to ${detectedVersion}`,
      });
    } else {
      return NextResponse.json(
        { error: 'Could not detect mod loader version from container' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error detecting mod loader version:', error);
    return NextResponse.json(
      { error: 'Failed to detect mod loader version' },
      { status: 500 }
    );
  }
}
