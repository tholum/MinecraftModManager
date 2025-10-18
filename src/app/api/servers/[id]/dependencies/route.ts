import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Server, ServerMod, ModVersion, ModProject } from '@/lib/database/entities';
import modDependencyService from '@/lib/services/mod-dependency.service';

interface ModrinthSearchResult {
  hits: Array<{
    project_id: string;
    slug: string;
    title: string;
  }>;
}

interface ModrinthVersionData {
  id: string;
  project_id: string;
  version_number: string;
  files: Array<{
    filename: string;
    url: string;
  }>;
}

async function backfillModrinthIds(serverId: number): Promise<number> {
  const db = await getDatabase();
  const serverRepository = db.getRepository(Server);
  const modVersionRepository = db.getRepository(ModVersion);
  const modProjectRepository = db.getRepository(ModProject);

  const server = await serverRepository.findOne({
    where: { id: serverId },
    relations: ['serverMods', 'serverMods.modVersion', 'serverMods.modVersion.project'],
  });

  if (!server) return 0;

  let backfillCount = 0;

  for (const serverMod of server.serverMods) {
    const modVersion = serverMod.modVersion;

    // Skip if already has modrinthVersionId
    if (modVersion.modrinthVersionId) continue;

    try {
      console.log(`Backfilling Modrinth ID for ${modVersion.project.name}...`);

      // Search for the project
      const searchResponse = await fetch(
        `https://api.modrinth.com/v2/search?query=${encodeURIComponent(modVersion.project.name)}&limit=5`
      );

      if (!searchResponse.ok) continue;

      const searchData: ModrinthSearchResult = await searchResponse.json();
      if (searchData.hits.length === 0) continue;

      const projectId = searchData.hits[0].project_id;

      // Update project modrinthId if not set
      if (!modVersion.project.modrinthId) {
        modVersion.project.modrinthId = projectId;
        modVersion.project.slug = searchData.hits[0].slug;
        await modProjectRepository.save(modVersion.project);
      }

      // Fetch versions for this project
      const versionsResponse = await fetch(
        `https://api.modrinth.com/v2/project/${projectId}/version`
      );

      if (!versionsResponse.ok) continue;

      const versions: ModrinthVersionData[] = await versionsResponse.json();

      // Try to match by filename
      let matchedVersion = versions.find(v =>
        v.files.some(f => f.filename === modVersion.fileName)
      );

      // Try matching by version number
      if (!matchedVersion) {
        matchedVersion = versions.find(v =>
          v.version_number === modVersion.versionNumber
        );
      }

      // Use latest version as fallback
      if (!matchedVersion && versions.length > 0) {
        matchedVersion = versions[0];
      }

      if (matchedVersion) {
        // Fetch the mod version again to ensure TypeORM is tracking it properly
        const trackedModVersion = await modVersionRepository.findOne({
          where: { id: modVersion.id },
        });

        if (trackedModVersion) {
          trackedModVersion.modrinthVersionId = matchedVersion.id;

          // Update download URL if not set
          if (!trackedModVersion.downloadUrl && matchedVersion.files.length > 0) {
            const primaryFile = matchedVersion.files.find(f => f.filename === modVersion.fileName)
              || matchedVersion.files[0];
            trackedModVersion.downloadUrl = primaryFile.url;
          }

          await modVersionRepository.save(trackedModVersion);
          backfillCount++;
          console.log(`✓ Backfilled ${modVersion.project.name} with Modrinth version ${matchedVersion.id}`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error backfilling ${modVersion.project.name}:`, error);
    }
  }

  return backfillCount;
}

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
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Backfill modrinth IDs first
    await backfillModrinthIds(serverId);

    // Check for missing dependencies
    const missingDeps = await modDependencyService.checkServerDependencies(
      serverId,
      server.minecraftVersion,
      server.modLoader
    );

    const dependencyList = Array.from(missingDeps.entries()).map(([modVersionId, info]) => ({
      modVersionId,
      reason: info.reason,
      depth: info.depth,
    }));

    return NextResponse.json({
      serverId,
      missingDependencies: dependencyList,
      count: dependencyList.length,
    });
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to check dependencies' },
      { status: 500 }
    );
  }
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
    const serverModRepository = db.getRepository(ServerMod);

    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Backfill modrinth IDs first
    const backfillCount = await backfillModrinthIds(serverId);
    console.log(`Backfilled ${backfillCount} mods with Modrinth IDs`);

    // Check for missing dependencies
    const missingDeps = await modDependencyService.checkServerDependencies(
      serverId,
      server.minecraftVersion,
      server.modLoader
    );

    const installedDeps = [];

    // Install all missing dependencies
    for (const [modVersionId, info] of missingDeps.entries()) {
      // Check if already installed (race condition check)
      const existing = await serverModRepository.findOne({
        where: {
          serverId,
          modVersionId,
        },
      });

      if (!existing) {
        const serverMod = serverModRepository.create({
          serverId,
          modVersionId,
          enabled: true,
        });

        await serverModRepository.save(serverMod);
        installedDeps.push({
          modVersionId,
          reason: info.reason,
        });
      }
    }

    return NextResponse.json({
      success: true,
      backfilled: backfillCount,
      installed: installedDeps,
      count: installedDeps.length,
    });
  } catch (error) {
    console.error('Error installing dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to install dependencies' },
      { status: 500 }
    );
  }
}
