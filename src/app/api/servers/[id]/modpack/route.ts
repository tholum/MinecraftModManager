import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';

export async function GET(
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

    // Get the request URL to construct absolute URLs for mod downloads
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Filter only enabled mods
    const enabledMods = server.serverMods.filter(sm => sm.enabled);

    // Generate mod URLs
    const modUrls = enabledMods.map(sm => {
      if (sm.modVersion.downloadUrl) {
        // If the mod has a direct download URL (e.g., from Modrinth), use that
        return sm.modVersion.downloadUrl;
      } else {
        // Otherwise, create a download endpoint for this mod
        return `${baseUrl}/api/servers/${serverId}/mods/${sm.modVersionId}/download`;
      }
    });

    // Create launcher profile name in format "modloader-version" (e.g., "neoforge-21.1.211")
    if (!server.modLoaderVersion || server.modLoaderVersion.trim() === '') {
      return NextResponse.json(
        { error: 'Server does not have a valid mod loader version configured. Please edit the server and select a mod loader version.' },
        { status: 400 }
      );
    }
    const launcherProfile = `${server.modLoader}-${server.modLoaderVersion.trim()}`;

    // Generate modpack definition
    const modpackDefinition = {
      modpacks: [
        {
          id: `server-${server.id}`,
          name: server.name,
          launcher_profile: launcherProfile,
          servers: [
            {
              name: server.name,
              address: host.split(':')[0], // Extract hostname without port
              port: server.port,
            },
          ],
          mods: modUrls,
        },
      ],
    };

    // Return as JSON file download
    return new NextResponse(JSON.stringify(modpackDefinition, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="modpack-${server.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`,
      },
    });
  } catch (error) {
    console.error('Error generating modpack definition:', error);
    return NextResponse.json(
      { error: 'Failed to generate modpack definition' },
      { status: 500 }
    );
  }
}
