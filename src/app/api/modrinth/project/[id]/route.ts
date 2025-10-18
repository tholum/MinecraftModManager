import { NextRequest, NextResponse } from 'next/server';
import modrinthService from '@/lib/services/modrinth.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const project = await modrinthService.getProject(id);

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching Modrinth project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project details' },
      { status: 500 }
    );
  }
}
