# Minecraft Server Manager

A modern web application for managing multiple Minecraft servers with Docker, built with Next.js 15, Material-UI, and TypeORM.

## Features

### 🎮 Server Management
- Create, configure, and manage multiple Minecraft servers
- Support for Vanilla, NeoForge, and Fabric mod loaders
- Full control over server settings (difficulty, gamemode, max players, PVP, etc.)
- Start, stop, and restart servers with one click
- Real-time server status monitoring
- Live server logs viewer

### 📦 Mod Management
- Central mod library for organizing mods
- Add/remove mods per server
- Enable/disable mods without deletion
- Automatic compatibility checking (mod loader & Minecraft version)
- Track mod versions and metadata

### 🐳 Docker Integration
- Each server runs in an isolated Docker container
- Automatic version management (Minecraft, NeoForge, Fabric)
- Persistent storage outside containers
- Named containers for easy management
- Port mapping and automatic restarts

### 🎨 User Interface
- Minecraft-themed Material-UI design
- Dashboard with server statistics
- Comprehensive server configuration forms
- Real-time status updates (auto-refresh)
- Responsive design for mobile/tablet

## Prerequisites

- Node.js 18+
- Docker (with Docker daemon running)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd minecraft-server-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Pull the Minecraft server Docker image**
   ```bash
   docker pull itzg/minecraft-server:latest
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## Storage Architecture

✅ **All server data is stored outside Docker containers for persistence!**

- **Server Files**: `minecraft-data/server-{id}/` (bind-mounted to container `/data`)
- **Database**: `data/minecraft-manager.db` (SQLite)
- **Mod Library**: `minecraft-data/mods-library/`

See [STORAGE.md](./STORAGE.md) for detailed architecture and backup instructions.

## Key Technologies

- **Frontend**: Next.js 15, React 19, Material-UI 6
- **Backend**: Next.js API Routes
- **Database**: TypeORM + SQLite (easily migrate to PostgreSQL/MySQL)
- **Docker**: dockerode for container management
- **Server Image**: itzg/minecraft-server (supports Vanilla, NeoForge, Fabric)

## Quick Start

```bash
# Install dependencies
npm install

# Pull Docker image
docker pull itzg/minecraft-server:latest

# Start development server
npm run dev

# Open http://localhost:3000
# Click "Create Server" and configure your first Minecraft server!
```

## Documentation

- [STORAGE.md](./STORAGE.md) - Detailed storage architecture, backup/restore
- API documentation available in source files

## License

MIT
