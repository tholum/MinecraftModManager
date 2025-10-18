import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileName: string }> }
) {
  try {
    const { id, fileName } = await params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    // Security: Validate fileName to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      );
    }

    const exportsDir = path.join(process.cwd(), 'minecraft-data', 'exports');
    const filePath = path.join(exportsDir, fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: 'Export file not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Return file as download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading export:', error);
    return NextResponse.json(
      { error: 'Failed to download export', details: error.message },
      { status: 500 }
    );
  }
}
