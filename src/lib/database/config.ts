import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Server } from './entities/Server';
import { Mod } from './entities/Mod';
import { ModProject } from './entities/ModProject';
import { ModVersion } from './entities/ModVersion';
import { ServerMod } from './entities/ServerMod';
import { RecipeDatapack } from './entities/RecipeDatapack';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: path.join(process.cwd(), 'data', 'minecraft-manager.db'),
  entities: [Server, Mod, ModProject, ModVersion, ServerMod, RecipeDatapack],
  synchronize: isDevelopment, // Auto-sync schema in development
  logging: isDevelopment,
};

export const AppDataSource = new DataSource(dataSourceOptions);

let isInitialized = false;

export async function initializeDatabase() {
  if (isInitialized) {
    return AppDataSource;
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database initialized successfully');
      isInitialized = true;
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!isInitialized || !AppDataSource.isInitialized) {
    return await initializeDatabase();
  }
  return AppDataSource;
}
