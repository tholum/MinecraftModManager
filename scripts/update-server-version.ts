import { DataSource } from 'typeorm';
import { Server } from '../src/lib/database/entities';

async function updateServerVersion() {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: './data/minecraft-manager.db',
    entities: [Server],
    synchronize: false,
  });

  await dataSource.initialize();

  const serverRepository = dataSource.getRepository(Server);

  // Update server 2 with the correct NeoForge version
  const server = await serverRepository.findOne({ where: { id: 2 } });

  if (server) {
    server.modLoaderVersion = '21.1.211';
    await serverRepository.save(server);
    console.log('Updated server 2 to NeoForge version 21.1.211');
  } else {
    console.log('Server 2 not found');
  }

  await dataSource.destroy();
}

updateServerVersion().catch(console.error);
