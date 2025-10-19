import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum ServerStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
}

export enum ModLoader {
  VANILLA = 'vanilla',
  NEOFORGE = 'neoforge',
  FABRIC = 'fabric',
}

export interface ServerSettings {
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
  gamemode?: 'survival' | 'creative' | 'adventure' | 'spectator';
  maxPlayers?: number;
  pvp?: boolean;
  allowNether?: boolean;
  allowFlight?: boolean;
  spawnMonsters?: boolean;
  spawnAnimals?: boolean;
  spawnNpcs?: boolean;
  viewDistance?: number;
  simulationDistance?: number;
  levelType?: string;
  motd?: string;
  onlineMode?: boolean;
  whitelist?: boolean;
  enableCommandBlock?: boolean;
  [key: string]: any; // Allow additional custom settings
}

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int' })
  port!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: ServerStatus.STOPPED,
  })
  status!: ServerStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dockerContainerId?: string;

  @Column({ type: 'varchar', length: 50 })
  minecraftVersion!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ModLoader.VANILLA,
  })
  modLoader!: ModLoader;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modLoaderVersion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  seed?: string;

  @Column({ type: 'varchar', length: 10, default: '2G' })
  memory!: string;

  @Column({ type: 'float', nullable: true })
  cpuLimit?: number;

  @Column({ type: 'json', nullable: true })
  settings?: ServerSettings;

  @OneToMany('ServerMod', (serverMod: any) => serverMod.server, {
    cascade: true,
  })
  serverMods?: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
