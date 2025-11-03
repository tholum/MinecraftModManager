# Custom Recipe Management System

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Guide](#user-guide)
3. [Technical Architecture](#technical-architecture)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [File Structure](#file-structure)
7. [Deployment Process](#deployment-process)
8. [Troubleshooting](#troubleshooting)
9. [Future Enhancements](#future-enhancements)

---

## Feature Overview

The Custom Recipe Management System allows server administrators to create, manage, and deploy custom Minecraft recipes through a web interface. The system supports all Minecraft recipe types and provides a seamless workflow from creation to deployment.

### Key Features

- **Visual Recipe Editor**: Interactive 3x3 crafting grid for shaped recipes
- **Template Library**: Pre-built recipe templates for common items
- **Item Autocomplete**: Search and select from Minecraft items with validation
- **Recipe Types Supported**:
  - Crafting (Shaped and Shapeless)
  - Smelting
  - Blasting
  - Smoking
  - Campfire Cooking
  - Stonecutting
  - Smithing Transform
- **Import/Export**: Bulk import/export recipes as JSON or ZIP files
- **Hot Reload**: Automatically reload recipes on running servers via RCON
- **Recipe Management**: Enable/disable recipes without deleting them
- **Validation**: Comprehensive client and server-side validation

### Benefits

1. **No Manual File Editing**: Create recipes through an intuitive UI
2. **Zero Server Downtime**: Deploy recipes while the server is running
3. **Version Control Ready**: Export recipes for backup and version control
4. **Error Prevention**: Built-in validation prevents invalid recipes
5. **Multi-Server Support**: Manage recipes separately for each server

---

## User Guide

### Creating a Recipe

1. **Navigate to Recipe Manager**
   - Go to your server's detail page
   - Click on the "Custom Recipes" section

2. **Start Creating**
   - Click "Add Recipe" button
   - Optionally select a template to start from

3. **Configure Basic Info** (Tab 1)
   - **Recipe Name**: Lowercase identifier (e.g., `diamond_from_iron`)
   - **Namespace**: Category for your recipe (default: `custom`)
   - **Recipe Type**: Choose from 8 supported types

4. **Set Ingredients** (Tab 2)
   - **Shaped Crafting**: Click cells in the 3x3 grid to place items
   - **Shapeless Crafting**: Add up to 9 ingredients
   - **Cooking Recipes**: Set ingredient, experience, and cooking time
   - **Stonecutting**: Set ingredient
   - **Smithing**: Set template, base, and addition items

5. **Set Result** (Tab 3)
   - Choose the output item
   - Set the result count (for applicable recipes)

6. **Save Recipe**
   - Click "Create Recipe" to save to database

### Deploying Recipes

**Option 1: Deploy All Enabled Recipes**
1. Click "Deploy All" button
2. System will:
   - Generate datapack files for all enabled recipes
   - Copy datapack to server's world folder
   - Send `/reload` command to running server (if applicable)

**Option 2: Enable/Disable Individual Recipes**
- Use the toggle switch next to each recipe
- Only enabled recipes are deployed

### Importing Recipes

1. Click "Import" button
2. Upload:
   - Single recipe JSON file
   - ZIP file containing multiple recipe JSON files
3. System validates and imports recipes
4. Refresh to see imported recipes

### Exporting Recipes

1. Click "Export" button
2. Downloads a ZIP file containing:
   - All recipes in Minecraft datapack JSON format
   - Organized by namespace
   - Ready to use as a standalone datapack

### Editing Recipes

1. Click the edit icon (pencil) next to a recipe
2. Modify any fields
3. Click "Update Recipe" to save changes

### Deleting Recipes

1. Click the delete icon (trash) next to a recipe
2. Confirm deletion (this action cannot be undone)
3. Recipe is removed from database and next deployment

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
├─────────────────────────────────────────────────────┤
│  RecipeManager → RecipeForm → CraftingGridVisual    │
│                ↓                                     │
│          ItemAutocomplete                            │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────┐
│                  API Routes                          │
├─────────────────────────────────────────────────────┤
│  /api/servers/[id]/recipes                          │
│  /api/servers/[id]/recipes/[recipeId]               │
│  /api/servers/[id]/recipes/deploy                   │
│  /api/servers/[id]/recipes/import                   │
│  /api/servers/[id]/recipes/export                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Services Layer                          │
├─────────────────────────────────────────────────────┤
│  DatapackService → File System                       │
│  DockerService   → RCON Commands                    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Database (SQLite/TypeORM)               │
├─────────────────────────────────────────────────────┤
│  RecipeDatapack Entity                               │
│  Server Entity (relationship)                        │
└─────────────────────────────────────────────────────┘
```

### Data Flow

#### Creating a Recipe
1. User fills out RecipeForm with validation
2. POST request to `/api/servers/[id]/recipes`
3. Zod validates request body
4. Recipe saved to database via TypeORM
5. Returns created recipe with ID

#### Deploying Recipes
1. User clicks "Deploy All"
2. POST request to `/api/servers/[id]/recipes/deploy`
3. DatapackService:
   - Fetches all enabled recipes from database
   - Converts to Minecraft JSON format
   - Writes files to `server/world/datapacks/`
   - Creates pack.mcmeta if needed
4. DockerService sends `/reload` via RCON
5. Minecraft reloads datapacks

### Key Design Decisions

**1. Database Storage Format**
- Recipes stored in a normalized format (not Minecraft JSON)
- Allows validation, querying, and modification
- Converted to Minecraft format only during deployment

**2. Datapack Generation**
- Dynamic generation ensures recipes always match database
- Separate namespace folders for organization
- Automatic pack.mcmeta creation with versioning

**3. Type Safety**
- TypeScript interfaces for all recipe types
- Zod schemas for runtime validation
- RecipeType enum shared between entity and types

**4. Hot Reload**
- Uses RCON for zero-downtime deployments
- Graceful fallback if server is offline
- User-friendly error messages

---

## API Reference

### GET `/api/servers/[id]/recipes`

Fetch all recipes for a server.

**Response:**
```json
{
  "recipes": [
    {
      "id": 1,
      "serverId": 1,
      "name": "diamond_from_iron",
      "namespace": "custom",
      "recipeType": "crafting_shaped",
      "recipeData": { ... },
      "enabled": true,
      "createdAt": "2025-10-30T10:00:00Z",
      "updatedAt": "2025-10-30T10:00:00Z"
    }
  ]
}
```

### POST `/api/servers/[id]/recipes`

Create a new recipe.

**Request Body:**
```json
{
  "name": "diamond_from_iron",
  "namespace": "custom",
  "type": "crafting_shaped",
  "data": {
    "pattern": ["III", "I I", "III"],
    "key": {
      "I": { "item": "minecraft:iron_ingot" }
    },
    "result": {
      "item": "minecraft:diamond",
      "count": 1
    }
  },
  "enabled": true
}
```

**Validation Rules:**
- `name`: Required, 1-255 chars, lowercase alphanumeric with `_` and `-`
- `namespace`: Required, 1-255 chars, same format as name
- `type`: Must be one of the 8 supported recipe types
- `data`: Must match schema for the recipe type
- `enabled`: Optional boolean (default: true)

**Response:** `201 Created`
```json
{
  "success": true,
  "recipe": { ... }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors with details
- `404 Not Found`: Server not found
- `409 Conflict`: Recipe with same name/namespace exists
- `500 Internal Server Error`: Server error

### GET `/api/servers/[id]/recipes/[recipeId]`

Fetch a specific recipe.

**Response:** `200 OK`
```json
{
  "recipe": { ... }
}
```

### PATCH `/api/servers/[id]/recipes/[recipeId]`

Update a recipe.

**Request Body:** (All fields optional)
```json
{
  "name": "new_name",
  "namespace": "new_namespace",
  "type": "crafting_shapeless",
  "data": { ... },
  "enabled": false
}
```

**Response:** `200 OK`

### DELETE `/api/servers/[id]/recipes/[recipeId]`

Delete a recipe.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Recipe deleted successfully"
}
```

### POST `/api/servers/[id]/recipes/deploy`

Deploy all enabled recipes to the server.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Successfully deployed 5 enabled recipe(s) to datapack",
  "recipesDeployed": 5,
  "reload": {
    "success": true,
    "output": "Reloading!"
  }
}
```

### POST `/api/servers/[id]/recipes/import`

Import recipes from JSON or ZIP file.

**Request:** `multipart/form-data`
- `file`: JSON or ZIP file

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Successfully imported 3 recipe(s)",
  "imported": 3,
  "skipped": 1,
  "errors": []
}
```

### GET `/api/servers/[id]/recipes/export`

Export all recipes as a ZIP file.

**Response:** `200 OK`
- Content-Type: `application/zip`
- Downloads: `recipes-server-{id}-{timestamp}.zip`

### GET `/api/minecraft/items?search={query}`

Search for Minecraft items (for autocomplete).

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "minecraft:diamond",
      "name": "diamond",
      "displayName": "Diamond",
      "stackSize": 64,
      "iconUrl": "..."
    }
  ]
}
```

---

## Database Schema

### RecipeDatapack Entity

**Table:** `recipe_datapacks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key, auto-increment |
| `serverId` | INTEGER | Foreign key to servers table |
| `name` | VARCHAR(255) | Recipe name (e.g., "diamond_from_iron") |
| `namespace` | VARCHAR(255) | Recipe namespace (e.g., "custom") |
| `recipeType` | VARCHAR(50) | Recipe type enum value |
| `recipeData` | JSON | Recipe-specific data structure |
| `enabled` | BOOLEAN | Whether recipe is active (default: true) |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Foreign key on `serverId` with CASCADE delete
- Unique constraint on `(serverId, namespace, name)`

**Relationships:**
- Many-to-One with Server entity
- Cascade delete when server is deleted

### RecipeType Enum Values

```typescript
enum RecipeType {
  CRAFTING_SHAPED = 'crafting_shaped',
  CRAFTING_SHAPELESS = 'crafting_shapeless',
  SMELTING = 'smelting',
  BLASTING = 'blasting',
  SMOKING = 'smoking',
  CAMPFIRE_COOKING = 'campfire_cooking',
  STONECUTTING = 'stonecutting',
  SMITHING_TRANSFORM = 'smithing_transform',
}
```

### Recipe Data Structures

**Crafting Shaped:**
```json
{
  "pattern": ["AAA", "A A", "AAA"],
  "key": {
    "A": { "item": "minecraft:iron_ingot" }
  },
  "result": {
    "item": "minecraft:diamond",
    "count": 1
  },
  "group": "optional_group_name"
}
```

**Crafting Shapeless:**
```json
{
  "ingredients": [
    { "item": "minecraft:diamond" },
    { "item": "minecraft:stick" }
  ],
  "result": {
    "item": "minecraft:diamond_sword",
    "count": 1
  },
  "group": "weapons"
}
```

**Cooking (Smelting/Blasting/Smoking/Campfire):**
```json
{
  "ingredient": { "item": "minecraft:iron_ore" },
  "result": "minecraft:iron_ingot",
  "experience": 0.7,
  "cookingtime": 200,
  "group": "metals"
}
```

**Stonecutting:**
```json
{
  "ingredient": { "item": "minecraft:stone" },
  "result": "minecraft:stone_bricks",
  "count": 1,
  "group": "building_blocks"
}
```

**Smithing Transform:**
```json
{
  "template": { "item": "minecraft:netherite_upgrade_smithing_template" },
  "base": { "item": "minecraft:diamond_sword" },
  "addition": { "item": "minecraft:netherite_ingot" },
  "result": { "item": "minecraft:netherite_sword" }
}
```

---

## File Structure

```
src/
├── app/api/servers/[id]/recipes/
│   ├── route.ts                    # List & create recipes
│   ├── [recipeId]/
│   │   ├── route.ts                # Get, update, delete recipe
│   │   ├── toggle/route.ts         # Toggle enabled status
│   │   └── export/route.ts         # Export single recipe
│   ├── deploy/route.ts             # Deploy recipes to server
│   ├── import/route.ts             # Import recipes from file
│   └── export/route.ts             # Export all recipes
│
├── components/recipes/
│   ├── RecipeManager.tsx           # Main recipe management UI
│   ├── RecipeForm.tsx              # Recipe creation/edit form
│   ├── CraftingGridVisual.tsx      # 3x3 crafting grid component
│   └── ItemAutocomplete.tsx        # Item search & validation
│
├── lib/
│   ├── database/entities/
│   │   ├── RecipeDatapack.ts       # Recipe entity & enum
│   │   └── index.ts                # Export all entities
│   ├── services/
│   │   ├── datapack.service.ts     # Datapack file operations
│   │   └── docker.service.ts       # RCON command execution
│   └── constants/
│       └── recipeTemplates.ts      # Pre-built recipe templates
│
└── types/
    └── recipe.types.ts              # TypeScript type definitions

servers/
└── {serverId}/
    └── world/
        └── datapacks/
            └── custom_recipes/
                ├── pack.mcmeta     # Datapack metadata
                └── data/
                    └── {namespace}/
                        └── recipes/
                            └── {recipe_name}.json
```

### Generated Datapack Structure

When recipes are deployed, the system creates:

```
custom_recipes/
├── pack.mcmeta
└── data/
    ├── custom/
    │   └── recipes/
    │       ├── diamond_from_iron.json
    │       └── custom_sword.json
    └── mymod/
        └── recipes/
            └── special_item.json
```

**pack.mcmeta:**
```json
{
  "pack": {
    "pack_format": 41,
    "description": "Custom recipes managed by Minecraft Server Manager"
  }
}
```

---

## Deployment Process

### Manual Deployment Steps

1. **Prepare Server Environment**
   ```bash
   # Ensure server directory exists
   mkdir -p servers/{serverId}/world/datapacks
   ```

2. **Enable Recipe Management**
   - Recipe entity must be registered in `src/lib/database/entities/index.ts`
   - Database migrations run automatically on app start

3. **Configure Server**
   - Ensure RCON is enabled in server.properties
   - RCON password configured in server settings

4. **Create Recipes**
   - Use web interface to create recipes
   - Or import existing recipe JSON files

5. **Deploy Recipes**
   - Click "Deploy All" button
   - Or use API endpoint programmatically

### Automated Deployment

For CI/CD pipelines:

```bash
# Export recipes from one server
curl -X GET http://localhost:3000/api/servers/1/recipes/export \
  -o recipes.zip

# Import to another server
curl -X POST http://localhost:3000/api/servers/2/recipes/import \
  -F "file=@recipes.zip"

# Deploy recipes
curl -X POST http://localhost:3000/api/servers/2/recipes/deploy
```

### Docker Considerations

If running in Docker:
- Volume mount server data: `-v ./servers:/app/servers`
- Ensure write permissions to datapack folder
- RCON ports accessible between containers

---

## Troubleshooting

### Common Issues

#### 1. Recipes Not Loading In-Game

**Symptoms:**
- Recipes deployed successfully but don't work in-game
- No error messages
- Server shows same recipe count after reload

**Solutions:**
- **For NeoForge/Forge servers:** `/reload` is NOT sufficient - you MUST restart the server
  - Modded servers require a full restart to load new datapacks
  - The system will warn you about this when deploying
  - After deploying, restart your server from the server management page
- **For Vanilla/Paper/Spigot servers:** `/reload` should work
  - Run `/reload` command manually in-game
  - Or use the deploy button which attempts auto-reload
- Check Minecraft version compatibility (pack_format)
- Verify recipe JSON format is valid
- Check server logs for datapack errors:
  ```
  grep -i "datapack\|recipe" server.log
  ```
- Ensure datapack is in correct folder: `world/datapacks/custom_recipes/`

#### 2. Deployment Fails with "Server Not Running"

**Symptoms:**
- Deployment succeeds but reload fails
- Message: "Server is not running"

**Solutions:**
- This is expected behavior - recipes will load on server start
- Start the server to apply recipes
- Verify RCON configuration if server is running

#### 3. Import Fails with "Invalid Recipe Format"

**Symptoms:**
- Import returns 400 error
- Some recipes skipped

**Solutions:**
- Ensure JSON follows Minecraft recipe format
- Check recipe type is supported
- Validate item IDs exist in Minecraft
- Use export feature to see correct format

#### 4. Duplicate Recipe Error

**Symptoms:**
- 409 Conflict error when creating/importing
- Message: "Recipe with this name and namespace already exists"

**Solutions:**
- Use different recipe name
- Use different namespace
- Delete or update existing recipe
- Check for hidden/disabled recipes

#### 5. Crafting Grid Pattern Issues

**Symptoms:**
- Recipe doesn't work in-game
- Items placed differently than expected

**Solutions:**
- Ensure pattern uses correct characters
- Check all pattern keys have item mappings
- Verify no extra spaces in pattern
- Test with exact pattern in-game

### Debugging Tips

#### Enable Detailed Logging

Check server console for:
```
[Server thread/INFO]: Reloading ResourceManager
[Server thread/INFO]: Loaded 123 recipes
```

#### Validate Recipe JSON

Use online JSON validators:
- Ensure valid JSON syntax
- Check for missing commas, quotes
- Verify item IDs are correct

#### Test in Development

1. Create recipe in UI
2. Export to see generated JSON
3. Manually place in test world
4. Test in single-player first

#### Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Item ID required" | Empty item field | Fill all item fields |
| "Invalid recipe type" | Unknown type value | Use supported recipe types |
| "Pattern cannot be empty" | No items in grid | Place at least one item |
| "Cooking time must be positive" | Time ≤ 0 | Set time > 0 |
| "Count must be 1-64" | Invalid result count | Set count between 1-64 |

### Getting Help

If you encounter issues:

1. **Check Logs**
   - Browser console for frontend errors
   - Server logs for API errors
   - Minecraft server logs for recipe errors

2. **Verify Configuration**
   - Database connection
   - File system permissions
   - RCON settings

3. **Test Components**
   - Test API endpoints with curl
   - Test database queries directly
   - Test datapack manually

---

## Future Enhancements

### Planned Features

#### 1. Recipe Categories & Tags
- Organize recipes by category (weapons, tools, blocks)
- Tag-based filtering and search
- Bulk operations by category

#### 2. Recipe Validation Tool
- Pre-deployment validation
- Test recipes before applying
- Simulate crafting in UI

#### 3. Recipe History & Versioning
- Track recipe changes over time
- Rollback to previous versions
- Compare recipe versions

#### 4. Advanced Recipe Types
- Support for custom NBT data
- Item tags instead of specific items
- Conditional recipes (advancement-based)

#### 5. Bulk Operations
- Enable/disable multiple recipes
- Duplicate recipes with variations
- Mass import from mod packs

#### 6. Recipe Conflicts Detection
- Warn when recipes output same item
- Detect conflicting crafting patterns
- Suggest alternatives

#### 7. Visual Recipe Preview
- Show 3D item models
- Render crafting table preview
- Display in-game appearance

#### 8. Integration Features
- Export to mod formats
- Import from CraftTweaker scripts
- Sync with Git repositories

#### 9. Analytics & Statistics
- Track recipe usage
- Popular items report
- Recipe performance metrics

#### 10. Collaborative Features
- Share recipes between servers
- Community recipe library
- Recipe marketplace

### Technical Improvements

- **Performance**: Lazy loading for large recipe lists
- **Caching**: Cache parsed recipes for faster deployment
- **Testing**: Unit tests for recipe validation logic
- **Documentation**: Interactive recipe builder tutorial
- **Accessibility**: Full keyboard navigation support
- **Mobile**: Responsive design improvements

### Community Requests

Submit feature requests via GitHub Issues with:
- Use case description
- Expected behavior
- Screenshots/mockups (if applicable)

---

## Appendix

### Minecraft Pack Format Versions

| Minecraft Version | Pack Format |
|-------------------|-------------|
| 1.21.x | 41 |
| 1.20.5 - 1.20.6 | 41 |
| 1.20.3 - 1.20.4 | 26 |
| 1.20 - 1.20.2 | 15 |
| 1.19.4 | 13 |
| 1.19 - 1.19.3 | 12 |

Current default: `41` (1.21.x compatible)

### Useful Resources

- [Minecraft Wiki - Recipe](https://minecraft.wiki/w/Recipe)
- [Minecraft Data Pack Format](https://minecraft.wiki/w/Data_pack)
- [Recipe Generator Tools](https://crafting.thedestruc7i0n.ca/)
- [Item ID List](https://minecraft-ids.grahamedgecombe.com/)

### License

This feature is part of the Minecraft Server Manager project. See main LICENSE file for details.

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
**Maintainer:** Development Team
