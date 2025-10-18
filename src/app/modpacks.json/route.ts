import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server } from '@/lib/database/entities';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const serverRepository = db.getRepository(Server);

    const servers = await serverRepository.find({
      relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
      order: { createdAt: 'DESC' },
    });

    // Get the request URL to construct absolute URLs for mod downloads
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Generate modpacks array
    const modpacks = servers.map(server => {
      // Filter only enabled mods
      const enabledMods = server.serverMods.filter(sm => sm.enabled);

      // Generate mod URLs
      const modUrls = enabledMods.map(sm => {
        if (sm.modVersion.downloadUrl) {
          // If the mod has a direct download URL (e.g., from Modrinth), use that
          return sm.modVersion.downloadUrl;
        } else {
          // Otherwise, create a download endpoint for this mod
          return `${baseUrl}/api/servers/${server.id}/mods/${sm.modVersionId}/download`;
        }
      });

      // Create launcher profile in format "modloader-version" (e.g., "neoforge-21.1.211")
      const launcherProfile = server.modLoaderVersion && server.modLoaderVersion.trim()
        ? `${server.modLoader}-${server.modLoaderVersion.trim()}`
        : server.modLoader;

      return {
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
      };
    });

    // Generate modpack definition
    const modpackDefinition = {
      modpacks,
    };

    // Return as JSON
    return NextResponse.json(modpackDefinition);
  } catch (error) {
    console.error('Error generating modpacks definition:', error);
    return NextResponse.json(
      { error: 'Failed to generate modpacks definition' },
      { status: 500 }
    );
  }
}
