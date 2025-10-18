# Storage Architecture

This application uses **persistent host filesystem storage** for all Minecraft server data. Docker containers are ephemeral, but all important data is stored outside the containers.

## Directory Structure

```
minecraft-server-manager/
├── data/
│   └── minecraft-manager.db          # SQLite database
├── minecraft-data/
│   ├── server-1/                     # Server 1 data (bind-mounted to container)
│   │   ├── world/                    # Minecraft world files
│   │   ├── mods/                     # Server-specific mods
│   │   ├── config/                   # Server configs
│   │   ├── server.properties         # Server settings
│   │   ├── logs/                     # Server logs
│   │   └── ...                       # Other Minecraft server files
│   ├── server-2/                     # Server 2 data
│   │   └── ...
│   └── mods-library/                 # Central mod library
│       ├── fabric-api-0.92.0.jar
│       └── ...
```

## How It Works

### Volume Binding
Each Docker container mounts its server directory from the host:
- **Host Path**: `{project-root}/minecraft-data/server-{id}/`
- **Container Path**: `/data`
- **Docker Config**: `Binds: ["${volumePath}:/data"]`

This means:
- All files written by Minecraft inside `/data` appear on the host filesystem
- Data persists even if the container is stopped, removed, or recreated
- You can backup/restore servers by copying directories
- Multiple servers can run simultaneously without conflicts

### Benefits

1. **Data Persistence**: World saves, configs, and mods survive container recreation
2. **Easy Backups**: Simply copy the `minecraft-data/server-X/` directory
3. **Manual Access**: You can edit configs or copy files directly on the host
4. **Migration Ready**: Move the entire `minecraft-data/` folder to migrate all servers
5. **Version Control Safe**: `.gitignore` prevents committing large server files

### Storage Locations

| Data Type | Location | Purpose |
|-----------|----------|---------|
| Database | `data/minecraft-manager.db` | Server metadata, mod library, settings |
| Server Files | `minecraft-data/server-{id}/` | World, configs, logs per server |
| Mod Library | `minecraft-data/mods-library/` | Shared mod files |
| Server Mods | `minecraft-data/server-{id}/mods/` | Symlinks/copies from library |

### Container Management

The application creates **named Docker containers** for persistence:
- Container Name: `minecraft-server-{id}`
- Restart Policy: `unless-stopped`
- Port Mapping: `{server.port}:25565`

This ensures containers can be referenced by name and automatically restart with the Docker daemon.

## Backup & Restore

### Backup a Server
```bash
# Backup single server
tar -czf server-1-backup.tar.gz minecraft-data/server-1/

# Backup all servers
tar -czf all-servers-backup.tar.gz minecraft-data/

# Backup database
cp data/minecraft-manager.db backups/minecraft-manager-$(date +%Y%m%d).db
```

### Restore a Server
```bash
# Extract server data
tar -xzf server-1-backup.tar.gz

# The container will automatically use the restored files on next start
```

## Disk Space Considerations

Minecraft servers can use significant disk space:
- Vanilla server: ~500MB - 2GB
- Modded server: 2GB - 10GB+
- World size grows over time based on exploration

Monitor disk usage:
```bash
du -sh minecraft-data/server-*/
```

## Migration

To move the application to another machine:
1. Stop all servers
2. Copy `minecraft-data/` directory
3. Copy `data/minecraft-manager.db`
4. Install Docker and pull `itzg/minecraft-server:latest`
5. Start the application
6. All servers will be available with their data intact
