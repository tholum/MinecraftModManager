import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ModProject, ModVersion } from '@/lib/database/entities';
import modrinthService from '@/lib/services/modrinth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, minecraftVersion, modLoader } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if project already exists
    const existingProject = await db.getRepository(ModProject).findOne({
      where: { externalId: projectId },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'This mod is already in your library', project: existingProject },
        { status: 409 }
      );
    }

    // Fetch project details from Modrinth
    const projectData = await modrinthService.getProject(projectId);

    // Fetch all versions for the project
    const versions = await modrinthService.getProjectVersions(
      projectId,
      minecraftVersion,
      modLoader
    );

    // Create the mod project
    const modProject = new ModProject();
    modProject.name = projectData.title;
    modProject.slug = projectData.slug;
    modProject.description = projectData.description;
    modProject.author = projectData.team; // In real use, fetch team details
    modProject.projectUrl = `https://modrinth.com/mod/${projectData.slug}`;
    modProject.iconUrl = projectData.icon_url;
    modProject.source = 'modrinth';
    modProject.externalId = projectData.id;
    modProject.autoUpdate = true;

    await db.getRepository(ModProject).save(modProject);

    // Create mod versions
    const modVersions: ModVersion[] = [];
    for (const version of versions) {
      const primaryFile = version.files.find(f => f.primary) || version.files[0];

      const modVersion = new ModVersion();
      modVersion.projectId = modProject.id;
      modVersion.fileName = primaryFile.filename;
      modVersion.versionNumber = version.version_number;
      modVersion.modLoader = version.loaders[0] || 'fabric';
      modVersion.minecraftVersions = version.game_versions;
      modVersion.downloadUrl = primaryFile.url;
      modVersion.externalId = version.id;
      modVersion.fileSize = primaryFile.size;
      modVersion.sha1 = primaryFile.hashes.sha1;
      modVersion.releaseType = version.version_type;

      modVersions.push(modVersion);
    }

    await db.getRepository(ModVersion).save(modVersions);

    // Fetch the complete project with versions
    const completeProject = await db.getRepository(ModProject).findOne({
      where: { id: modProject.id },
      relations: ['versions'],
    });

    return NextResponse.json({
      success: true,
      project: completeProject,
      versionsAdded: modVersions.length,
    });
  } catch (error) {
    console.error('Error adding mod from Modrinth:', error);
    return NextResponse.json(
      { error: 'Failed to add mod from Modrinth' },
      { status: 500 }
    );
  }
}
