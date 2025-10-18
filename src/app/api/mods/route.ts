import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { Mod, ModLoader } from '@/lib/database/entities';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

const CreateModSchema = z.object({
  name: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  version: z.string().min(1).max(100),
  modLoader: z.nativeEnum(ModLoader),
  minecraftVersions: z.array(z.string()),
  downloadUrl: z.string().url().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  projectUrl: z.string().url().optional(),
  autoUpdate: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modLoader = searchParams.get('modLoader');
    const minecraftVersion = searchParams.get('minecraftVersion');

    const db = await getDatabase();
    const modRepository = db.getRepository(Mod);

    let query = modRepository.createQueryBuilder('mod');

    if (modLoader) {
      query = query.where('mod.modLoader = :modLoader', { modLoader });
    }

    if (minecraftVersion) {
      // SQLite JSON query
      query = query.andWhere(
        `json_each.value = :minecraftVersion`,
        { minecraftVersion }
      );
      query = query.innerJoin('json_each', 'json_each', `json_each.key = mod.minecraftVersions`);
    }

    const mods = await query.orderBy('mod.name', 'ASC').getMany();

    return NextResponse.json({ mods });
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateModSchema.parse(body);

    const db = await getDatabase();
    const modRepository = db.getRepository(Mod);

    // Check if mod with same name and version already exists
    const existingMod = await modRepository.findOne({
      where: {
        fileName: validatedData.fileName,
      },
    });

    if (existingMod) {
      return NextResponse.json(
        { error: 'Mod with this filename already exists' },
        { status: 400 }
      );
    }

    // Ensure mods library directory exists
    const modsLibraryPath = path.join(process.cwd(), 'minecraft-data', 'mods-library');
    await fs.mkdir(modsLibraryPath, { recursive: true });

    // Create mod entity
    const mod = modRepository.create({
      name: validatedData.name,
      fileName: validatedData.fileName,
      version: validatedData.version,
      modLoader: validatedData.modLoader,
      minecraftVersions: validatedData.minecraftVersions,
      downloadUrl: validatedData.downloadUrl,
      description: validatedData.description,
      author: validatedData.author,
      projectUrl: validatedData.projectUrl,
      autoUpdate: validatedData.autoUpdate,
    });

    const savedMod = await modRepository.save(mod);

    return NextResponse.json({ mod: savedMod }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating mod:', error);
    return NextResponse.json(
      { error: 'Failed to create mod' },
      { status: 500 }
    );
  }
}
