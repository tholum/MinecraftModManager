import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RecipeType {
  CRAFTING_SHAPED = 'crafting_shaped',
  CRAFTING_SHAPELESS = 'crafting_shapeless',
  SMELTING = 'smelting',
  BLASTING = 'blasting',
  SMOKING = 'smoking',
  CAMPFIRE_COOKING = 'campfire_cooking',
  STONECUTTING = 'stonecutting',
  SMITHING_TRANSFORM = 'smithing_transform',
}

@Entity('recipe_datapacks')
export class RecipeDatapack {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  serverId!: number;

  @ManyToOne('Server', (server: any) => server.recipeDatapacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serverId' })
  server?: any;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  namespace!: string;

  @Column({ type: 'varchar', length: 50 })
  recipeType!: RecipeType;

  @Column({ type: 'json' })
  recipeData!: any;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
