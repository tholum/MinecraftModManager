import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('mod_projects')
export class ModProject {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  projectUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string; // 'modrinth', 'curseforge', 'manual'

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId?: string; // Modrinth/CurseForge project ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  modrinthId?: string; // Modrinth project ID for dependency resolution

  @Column({ type: 'boolean', default: true })
  autoUpdate!: boolean;

  @OneToMany('ModVersion', (modVersion: any) => modVersion.project, {
    cascade: true,
  })
  versions?: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
