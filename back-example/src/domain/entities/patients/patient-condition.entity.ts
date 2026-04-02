import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Patient } from './patient.entity.js';

@Entity({ name: 'patient_conditions' })
export class PatientCondition extends BaseAuditEntity {
  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @ManyToOne('Patient', 'conditions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'varchar', length: 80 })
  type!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // The 'activa' field from the old schema is fundamentally mapped to BaseAuditEntity.isActive.
}
