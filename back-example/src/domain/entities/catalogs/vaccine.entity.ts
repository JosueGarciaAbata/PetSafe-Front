import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { Species } from './species.entity.js';

@Entity({ name: 'vaccines' })
export class Vaccine extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @ManyToOne(() => Species, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'species_id' })
  species!: Species;

  @Column({ name: 'is_revaccination', type: 'boolean', default: false })
  isRevaccination!: boolean;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory!: boolean;

  @Column({ name: 'dose_order', type: 'integer', nullable: true })
  doseOrder!: number | null;
}
