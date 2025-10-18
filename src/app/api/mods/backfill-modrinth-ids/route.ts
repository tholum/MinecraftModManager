import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ModVersion } from '@/lib/database/entities';

interface ModrinthSearchResult {
  hits: Array<{
    project_id: string;
    slug: string;
    title: string;
  }>;
}

interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  files: Array<{
    filename: string;
    url: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const versionRepository = db.getRepository(ModVersion);

    // Find all mod versions without a modrinthVersionId
    const modsWithoutId = await versionRepository.find({
      where: {},
      relations: ['project'],
    });

    const updates = [];
    const errors = [];

    for (const modVersion of modsWithoutId) {
      // Skip if already has modrinthVersionId
      if (modVersion.modrinthVersionId) {
        continue;
      }

      try {
        console.log(`Looking up Modrinth version for ${modVersion.project.name} (${modVersion.fileName})...`);

        // Try to find the project by name first
        const searchResponse = await fetch(
          `https://api.modrinth.com/v2/search?query=${encodeURIComponent(modVersion.project.name)}&limit=5`
        );

        if (!searchResponse.ok) {
          errors.push({
            modName: modVersion.project.name,
            error: 'Failed to search Modrinth',
          });
          continue;
        }

        const searchData: ModrinthSearchResult = await searchResponse.json();

        if (searchData.hits.length === 0) {
          errors.push({
            modName: modVersion.project.name,
            error: 'No results found on Modrinth',
          });
          continue;
        }

        // Use the first result (best match)
        const projectId = searchData.hits[0].project_id;

        // Update the project's modrinthId if not set
        if (!modVersion.project.modrinthId) {
          modVersion.project.modrinthId = projectId;
          modVersion.project.slug = searchData.hits[0].slug;
          await db.getRepository('ModProject').save(modVersion.project);
        }

        // Now fetch versions for this project
        const versionsResponse = await fetch(
          `https://api.modrinth.com/v2/project/${projectId}/version`
        );

        if (!versionsResponse.ok) {
          errors.push({
            modName: modVersion.project.name,
            error: 'Failed to fetch versions',
          });
          continue;
        }

        const versions: ModrinthVersion[] = await versionsResponse.json();

        // Try to match by filename or version number
        let matchedVersion = versions.find(v =>
          v.files.some(f => f.filename === modVersion.fileName)
        );

        if (!matchedVersion) {
          // Try matching by version number
          matchedVersion = versions.find(v =>
            v.version_number === modVersion.versionNumber
          );
        }

        if (!matchedVersion && versions.length > 0) {
          // Use the first (latest) version as fallback
          matchedVersion = versions[0];
        }

        if (matchedVersion) {
          modVersion.modrinthVersionId = matchedVersion.id;

          // Update download URL if not set
          if (!modVersion.downloadUrl && matchedVersion.files.length > 0) {
            const primaryFile = matchedVersion.files.find(f => f.filename === modVersion.fileName)
              || matchedVersion.files[0];
            modVersion.downloadUrl = primaryFile.url;
          }

          await versionRepository.save(modVersion);

          updates.push({
            modName: modVersion.project.name,
            fileName: modVersion.fileName,
            modrinthVersionId: matchedVersion.id,
          });

          console.log(`✓ Updated ${modVersion.project.name} with Modrinth version ${matchedVersion.id}`);
        } else {
          errors.push({
            modName: modVersion.project.name,
            error: 'No matching version found',
          });
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`Error processing ${modVersion.project.name}:`, error);
        errors.push({
          modName: modVersion.project.name,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      errors: errors.length,
      updates,
      errors,
    });
  } catch (error) {
    console.error('Error backfilling Modrinth IDs:', error);
    return NextResponse.json(
      { error: 'Failed to backfill Modrinth IDs' },
      { status: 500 }
    );
  }
}
