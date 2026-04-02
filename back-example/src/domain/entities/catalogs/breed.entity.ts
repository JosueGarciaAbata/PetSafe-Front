import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Species } from './species.entity.js';

@Entity({ name: 'breeds' })
export class Breed extends BaseAuditEntity {
  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @ManyToOne('Species', 'breeds', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'species_id' })
  species!: Species;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}
