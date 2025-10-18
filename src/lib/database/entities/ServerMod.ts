import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity('server_mods')
export class ServerMod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  serverId!: number;

  @Column({ type: 'int' })
  modVersionId!: number;

  @ManyToOne('Server', (server: any) => server.serverMods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serverId' })
  server?: any;

  @ManyToOne('ModVersion', (modVersion: any) => modVersion.serverMods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modVersionId' })
  modVersion?: any;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  addedAt!: Date;
}
