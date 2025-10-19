import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';
import path from 'path';
import fs from 'fs/promises';

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

    // Path to server.properties
    const volumePath = path.join(process.cwd(), 'minecraft-data', `server-${serverId}`);
    const propertiesPath = path.join(volumePath, 'server.properties');

    try {
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
          // Update existing setting
          const newContent = content.replace(regex, `${key}=${value}`);
          if (newContent !== content) {
            content = newContent;
            modified = true;
          }
        } else {
          // Add new setting
          content += `\n${key}=${value}`;
          modified = true;
        }
      }

      if (modified) {
        // Write updated content
        await fs.writeFile(propertiesPath, content, 'utf8');
        console.log(`Updated RCON settings in server.properties for server ${serverId}`);
      }

      return NextResponse.json({
        success: true,
        message: modified
          ? 'RCON settings have been updated in server.properties. Restart the server for changes to take effect.'
          : 'RCON settings are already configured correctly.',
        modified,
      });
    } catch (error) {
      console.error('Error updating server.properties:', error);
      return NextResponse.json(
        { error: 'Failed to update server.properties', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error ensuring RCON:', error);
    return NextResponse.json(
      { error: 'Failed to ensure RCON configuration', details: error.message },
      { status: 500 }
    );
  }
}
