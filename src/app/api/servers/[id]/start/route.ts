import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerStatus } from '@/lib/database/entities';
import dockerService from '@/lib/services/docker.service';
import path from 'path';
import fs from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const server = await serverRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Update status to starting
    server.status = ServerStatus.STARTING;
    await serverRepository.save(server);

    try {
      // Check if container exists, create if it doesn't
      const container = await dockerService.getContainer(server.id);

      if (!container) {
        console.log(`Container not found for server ${server.id}, creating new container...`);
        const containerId = await dockerService.createContainer(server);
        server.dockerContainerId = containerId;
        await serverRepository.save(server);
      }

      // Ensure RCON is always configured in server.properties before starting
      await ensureRconConfiguration(server.id);

      await dockerService.startContainer(server.id);

      // Update status to running
      server.status = ServerStatus.RUNNING;
      await serverRepository.save(server);

      return NextResponse.json({ server });
    } catch (error) {
      // Update status to error
      server.status = ServerStatus.ERROR;
      await serverRepository.save(server);
      throw error;
    }
  } catch (error) {
    console.error('Error starting server:', error);
    return NextResponse.json(
      { error: 'Failed to start server' },
      { status: 500 }
    );
  }
}

async function ensureRconConfiguration(serverId: number): Promise<void> {
  const volumePath = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`);
  const propertiesPath = path.join(volumePath, 'server.properties');

  try {
    // Check if server.properties exists
    try {
      await fs.access(propertiesPath);
    } catch {
      // File doesn't exist yet, it will be created by the container
      console.log(`server.properties doesn't exist yet for server ${serverId}, will be created on first start`);
      return;
    }

    // Read existing server.properties
    let content = await fs.readFile(propertiesPath, 'utf8');
    let modified = false;

    // Update or add RCON settings
    const rconSettings = {
      'enable-rcon': 'true',
      'rcon.password': 'minecraft',
      'rcon.port': '25575',
    };

    for (const [key, value] of Object.entries(rconSettings)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        // Update existing setting if it's not already correct
        const currentMatch = content.match(regex);
        if (currentMatch && currentMatch[0] !== `${key}=${value}`) {
          content = content.replace(regex, `${key}=${value}`);
          modified = true;
          console.log(`Updated ${key} in server.properties for server ${serverId}`);
        }
      } else {
        // Add new setting
        content += `\n${key}=${value}`;
        modified = true;
        console.log(`Added ${key} to server.properties for server ${serverId}`);
      }
    }

    if (modified) {
      await fs.writeFile(propertiesPath, content, 'utf8');
      console.log(`RCON configuration updated for server ${serverId}`);
    } else {
      console.log(`RCON configuration already correct for server ${serverId}`);
    }
  } catch (error) {
    console.error(`Error ensuring RCON configuration for server ${serverId}:`, error);
    // Don't throw - allow server to start even if RCON update fails
  }
}
