# Mod System V2 - Project & Versions Architecture

## Overview

The mod system has been redesigned to separate **Mod Projects** (the mod itself) from **Mod Versions** (specific releases). This allows:

- Add a mod once from Modrinth
- Store all its versions (different Minecraft versions, mod loaders)
- Select the appropriate version when adding to a server
- Auto-update by fetching new versions from Modrinth

## Database Schema

### ModProject
Represents a mod project (e.g., "Fabric API", "Sodium")

```typescript
{
  id: number
  name: string
  slug: string              // modrinth slug
  description: string
  author: string
  projectUrl: string
  iconUrl: string
  source: 'modrinth' | 'curseforge' | 'manual'
  externalId: string        // Modrinth project ID
  autoUpdate: boolean
  versions: ModVersion[]    // One-to-many relationship
}
```

### ModVersion
Represents a specific version of a mod

```typescript
{
  id: number
  projectId: number
  fileName: string          // e.g., fabric-api-0.92.0+1.20.4.jar
  versionNumber: string     // e.g., 0.92.0+1.20.4
  modLoader: string         // 'neoforge', 'fabric'
  minecraftVersions: string[] // ['1.20.4', '1.20.3']
  downloadUrl: string
  externalId: string        // Modrinth version ID
  fileSize: number
  sha1: string
  releaseType: string       // 'release', 'beta', 'alpha'
}
```

### ServerMod (Updated)
Links servers to specific mod versions

```typescript
{
  id: number
  serverId: number
  modVersionId: number      // Changed from modId
  enabled: boolean
  modVersion: ModVersion    // Relationship
}
```

## User Workflow

### Adding a Mod from Modrinth

1. User searches for "Fabric API" on Modrinth
2. Clicks on the mod
3. System creates `ModProject` record
4. System fetches **all versions** from Modrinth API
5. System creates multiple `ModVersion` records
6. User sees mod in library with version count

### Adding Mod to Server

1. User opens server's mod management
2. Browses mod library (shows projects)
3. Selects "Fabric API"
4. System shows compatible versions:
   - Filters by server's Minecraft version
   - Filters by server's mod loader
5. User selects specific version
6. `ServerMod` links to that `ModVersion`

### Auto-Update

1. System periodically checks Modrinth for new versions
2. Creates new `ModVersion` records
3. User can update server mods to newer versions
4. Old versions remain for rollback capability

## API Endpoints

### Mod Projects

```
GET    /api/mod-projects              List all projects
POST   /api/mod-projects              Create project (manual)
GET    /api/mod-projects/:id          Get project with versions
DELETE /api/mod-projects/:id          Delete project and versions
POST   /api/mod-projects/:id/sync     Sync versions from Modrinth
```

### Mod Versions

```
GET    /api/mod-projects/:id/versions           List versions for project
GET    /api/mod-versions/:id                    Get version details
POST   /api/mod-projects/:id/versions           Add version manually
```

### Modrinth Integration

```
POST   /api/modrinth/add-project    Add mod project from Modrinth
                                    (creates project + all versions)
```

### Server Mods

```
GET    /api/servers/:id/mods                Get server's installed mods
POST   /api/servers/:id/mods                Add mod version to server
       Body: { modVersionId: number }
PATCH  /api/servers/:id/mods/:modVersionId  Toggle enabled/disabled
DELETE /api/servers/:id/mods/:modVersionId  Remove from server
```

## UI Components

### ModLibrary Component

Shows all mod projects with:
- Mod icon, name, author
- Description
- Number of versions available
- Source badge (Modrinth/Manual)
- Click to expand and see versions

### ModVersionSelector Component

When adding mod to server:
- Shows compatible versions only
- Displays: version number, Minecraft versions, mod loader, release type
- Highlights recommended version
- Shows file size

### ServerModsManager Component

Shows installed mods on server:
- Mod project name with icon
- Currently selected version
- Button to change version
- Enable/disable toggle
- Remove button

## Benefits

✅ **Single Source of Truth**: One mod project, multiple versions
✅ **Smart Filtering**: Only show compatible versions per server
✅ **Easy Updates**: Update to newer version with one click
✅ **Rollback**: Downgrade to older version if needed
✅ **Multi-Loader Support**: Fabric and NeoForge versions in same project
✅ **Auto-Sync**: Fetch new versions from Modrinth automatically
✅ **Storage Efficient**: Don't duplicate mod metadata per version

## Migration Path

Since this is a new database schema:
1. New tables will be created automatically
2. Old `mods` table can be migrated or deprecated
3. Recommend fresh start for beta/dev environment
4. Production migration would copy mods to new structure
