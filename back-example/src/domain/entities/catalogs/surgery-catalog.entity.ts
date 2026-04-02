import { Entity, Column } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';

@Entity({ name: 'surgery_catalog' })
export class SurgeryCatalog extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'requires_anesthesia', type: 'boolean', default: false })
  requiresAnesthesia!: boolean;
}
