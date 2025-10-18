import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('mod_versions')
export class ModVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  projectId!: number;

  @ManyToOne('ModProject', (project: any) => project.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project?: any;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 100 })
  versionNumber!: string;

  @Column({ type: 'varchar', length: 50 })
  modLoader!: string; // 'neoforge', 'fabric', 'forge', etc.

  @Column({ type: 'json' })
  minecraftVersions!: string[];

  @Column({ type: 'text', nullable: true })
  downloadUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId?: string; // Modrinth/CurseForge version ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  modrinthVersionId?: string; // Modrinth version ID for dependency resolution

  @Column({ type: 'integer', nullable: true })
  fileSize?: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sha1?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  releaseType?: string; // 'release', 'beta', 'alpha'

  @OneToMany('ServerMod', (serverMod: any) => serverMod.modVersion)
  serverMods?: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
