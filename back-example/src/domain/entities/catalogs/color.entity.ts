import { Entity, Column } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';

@Entity({ name: 'colors' })
export class Color extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  name!: string;
}
