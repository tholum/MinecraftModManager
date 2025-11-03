import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { RecipeDatapack } from '@/lib/database/entities/RecipeDatapack';
import { Server } from '@/lib/database/entities';
import datapackService from '@/lib/services/datapack.service';
import dockerService from '@/lib/services/docker.service';

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
    const recipeRepository = db.getRepository(RecipeDatapack);

    // Verify the server exists
    const server = await serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Count enabled recipes before deployment
    const enabledRecipes = await recipeRepository.count({
      where: { serverId, enabled: true },
    });

    // Deploy recipes using the datapack service
    await datapackService.syncRecipesForServer(serverId);

    // Optionally send /reload command via RCON to hot-reload recipes
    const reloadResult = await dockerService.executeRconCommand(serverId, 'reload');

    // Determine appropriate message based on server type and result
    let finalMessage = `Successfully deployed ${enabledRecipes} enabled recipe(s) to datapack`;
    let requiresRestart = false;

    // Check if server is using NeoForge or Forge (modded servers often need restart for datapacks)
    if (server.modLoader === 'neoforge' || server.modLoader === 'forge') {
      finalMessage += '. Note: NeoForge/Forge servers typically require a full restart (not just /reload) to load new datapacks.';
      requiresRestart = true;
    }

    if (!reloadResult.success) {
      // Enhance error message based on the specific error
      if (reloadResult.error === 'Container not found' || reloadResult.error === 'Server is not running') {
        reloadResult.error = 'Server is not running. Recipes will be loaded when the server starts.';
      } else {
        reloadResult.error = 'Failed to reload recipes on server. You may need to restart the server manually.';
      }
    } else if (server.modLoader === 'neoforge' || server.modLoader === 'forge') {
      reloadResult.warning = '/reload executed, but NeoForge/Forge may require a full server restart to load new datapacks.';
    }

    return NextResponse.json({
      success: true,
      message: finalMessage,
      recipesDeployed: enabledRecipes,
      requiresRestart,
      reload: reloadResult,
    });
  } catch (error) {
    console.error('Error deploying recipes:', error);
    return NextResponse.json(
      { error: 'Failed to deploy recipes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
