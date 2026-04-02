import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { TreatmentStatusEnum } from '../../enums/index.js';
import type { Encounter } from './encounter.entity.js';
import type { TreatmentItem } from './treatment-item.entity.js';

@Entity({ name: 'treatments' })
export class Treatment extends BaseAuditEntity {
  @Column({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @ManyToOne('Encounter', 'treatments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({
    type: 'enum',
    enum: TreatmentStatusEnum,
    enumName: 'treatment_status_enum',
    default: TreatmentStatusEnum.ACTIVO,
  })
  status!: TreatmentStatusEnum;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'general_instructions', type: 'text', nullable: true })
  generalInstructions!: string | null;

  @OneToMany('TreatmentItem', 'treatment', { cascade: true })
  items!: TreatmentItem[];
}
