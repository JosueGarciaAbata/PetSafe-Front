import { Entity, Column } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';

@Entity({ name: 'procedure_catalog' })
export class ProcedureCatalog extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
