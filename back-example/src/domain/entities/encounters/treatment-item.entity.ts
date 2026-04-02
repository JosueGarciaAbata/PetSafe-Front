import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { TreatmentItemStatusEnum } from '../../enums/index.js';
import type { Treatment } from './treatment.entity.js';

@Entity({ name: 'treatment_items' })
export class TreatmentItem extends BaseAuditEntity {
  @Column({ name: 'treatment_id', type: 'int' })
  treatmentId!: number;

  @ManyToOne('Treatment', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'treatment_id' })
  treatment!: Treatment;

  @Column({ type: 'varchar', length: 120 })
  medication!: string;

  @Column({ type: 'varchar', length: 120 })
  dose!: string;

  @Column({ type: 'varchar', length: 120 })
  frequency!: string;

  @Column({ name: 'duration_days', type: 'integer' })
  durationDays!: number;

  @Column({ name: 'administration_route', type: 'varchar', length: 120 })
  administrationRoute!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    type: 'enum',
    enum: TreatmentItemStatusEnum,
    enumName: 'treatment_item_status_enum',
    default: TreatmentItemStatusEnum.ACTIVO,
  })
  status!: TreatmentItemStatusEnum;
}
