import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Encounter } from './encounter.entity.js';
import type { ProcedureCatalog } from '../catalogs/procedure-catalog.entity.js';

@Entity({ name: 'procedures' })
export class Procedure extends BaseAuditEntity {
  @Column({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @ManyToOne('Encounter', 'procedures', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'catalog_id', type: 'int', nullable: true })
  catalogId!: number | null;

  @ManyToOne('ProcedureCatalog', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'catalog_id' })
  catalog!: ProcedureCatalog;

  @Column({ name: 'procedure_type', type: 'varchar', length: 120 })
  procedureType!: string;

  @Column({ name: 'performed_date', type: 'timestamp without time zone' })
  performedDate!: Date;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  result!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
