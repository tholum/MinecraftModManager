import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { ModProject } from '@/lib/database/entities';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const projectRepo = db.getRepository(ModProject);

    const projects = await projectRepo.find({
      relations: ['versions'],
      order: { createdAt: 'DESC' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching mod projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mod projects' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectRepo = db.getRepository(ModProject);

    const project = await projectRepo.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await projectRepo.remove(project);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mod project:', error);
    return NextResponse.json(
      { error: 'Failed to delete mod project' },
      { status: 500 }
    );
  }
}
