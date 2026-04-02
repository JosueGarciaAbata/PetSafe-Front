import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import type { Patient } from './patient.entity.js';
import type { Client } from '../persons/client.entity.js';

@Entity({ name: 'patient_tutors' })
export class PatientTutor {
  @PrimaryColumn({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @PrimaryColumn({ name: 'client_id', type: 'int' })
  clientId!: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({
    name: 'relationship',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  relationship!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
  })
  createdAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  deletedAt!: Date | null;

  @Column({ name: 'deleted_by_user_id', type: 'int', nullable: true })
  deletedByUserId!: number | null;

  @ManyToOne('Patient', 'tutors', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @ManyToOne('Client', 'patientTutors', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;
}
