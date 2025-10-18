import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ModLoader } from './Server';

@Entity('mods')
export class Mod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 100 })
  version!: string;

  @Column({ type: 'varchar', length: 50 })
  modLoader!: ModLoader;

  @Column({ type: 'json' })
  minecraftVersions!: string[];

  @Column({ type: 'text', nullable: true })
  downloadUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  projectUrl?: string;

  @Column({ type: 'boolean', default: false })
  autoUpdate!: boolean;

  @OneToMany('ServerMod', (serverMod: any) => serverMod.mod)
  serverMods?: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
