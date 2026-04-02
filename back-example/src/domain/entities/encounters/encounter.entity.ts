import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { EncounterStatusEnum } from '../../enums/index.js';
import type { Appointment } from '../appointments/appointment.entity.js';
import type { QueueEntry } from '../appointments/queue-entry.entity.js';
import type { Patient } from '../patients/patient.entity.js';
import type { Employee } from '../persons/employee.entity.js';
import type { User } from '../auth/user.entity.js';
import type { EncounterConsultationReason } from './encounter-consultation-reason.entity.js';
import type { EncounterAnamnesis } from './encounter-anamnesis.entity.js';
import type { EncounterClinicalExam } from './encounter-clinical-exam.entity.js';
import type { EncounterEnvironmentalData } from './encounter-environmental-data.entity.js';
import type { EncounterClinicalImpression } from './encounter-clinical-impression.entity.js';
import type { EncounterPlan } from './encounter-plan.entity.js';
import type { Treatment } from './treatment.entity.js';
import type { VaccinationEvent } from './vaccination-event.entity.js';
import type { DewormingEvent } from './deworming-event.entity.js';
import type { Surgery } from './surgery.entity.js';
import type { Procedure } from './procedure.entity.js';

@Entity({ name: 'encounters' })
export class Encounter extends BaseAuditEntity {
  @Column({ name: 'appointment_id', type: 'int', nullable: true })
  appointmentId!: number | null;

  @ManyToOne('Appointment', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @Column({ name: 'queue_entry_id', type: 'int', nullable: true })
  queueEntryId!: number | null;

  @ManyToOne('QueueEntry', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'queue_entry_id' })
  queueEntry!: QueueEntry | null;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @ManyToOne('Patient', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'vet_id', type: 'int' })
  vetId!: number;

  @ManyToOne('Employee', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vet_id' })
  vet!: Employee;

  @Column({ name: 'start_time', type: 'timestamp without time zone' })
  startTime!: Date;

  @Column({
    name: 'end_time',
    type: 'timestamp without time zone',
    nullable: true,
  })
  endTime!: Date | null;

  @Column({
    type: 'enum',
    enum: EncounterStatusEnum,
    enumName: 'encounter_status_enum',
    default: EncounterStatusEnum.ACTIVA,
  })
  status!: EncounterStatusEnum;

  @Column({ name: 'general_notes', type: 'text', nullable: true })
  generalNotes!: string | null;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId!: number | null;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;

  // ── Detail sub-entities (1:1) ──
  @OneToOne('EncounterConsultationReason', 'encounter', { cascade: true })
  consultationReason!: EncounterConsultationReason | null;

  @OneToOne('EncounterAnamnesis', 'encounter', { cascade: true })
  anamnesis!: EncounterAnamnesis | null;

  @OneToOne('EncounterClinicalExam', 'encounter', { cascade: true })
  clinicalExam!: EncounterClinicalExam | null;

  @OneToOne('EncounterEnvironmentalData', 'encounter', {
    cascade: true,
  })
  environmentalData!: EncounterEnvironmentalData | null;

  @OneToOne('EncounterClinicalImpression', 'encounter', {
    cascade: true,
  })
  clinicalImpression!: EncounterClinicalImpression | null;

  @OneToOne('EncounterPlan', 'encounter', { cascade: true })
  plan!: EncounterPlan | null;

  // ── Detail sub-entities (1:N) ──
  @OneToMany('Treatment', 'encounter', { cascade: true })
  treatments!: Treatment[];

  @OneToMany('VaccinationEvent', 'encounter', { cascade: true })
  vaccinationEvents!: VaccinationEvent[];

  @OneToMany('DewormingEvent', 'encounter', { cascade: true })
  dewormingEvents!: DewormingEvent[];

  @OneToMany('Surgery', 'encounter', { cascade: true })
  surgeries!: Surgery[];

  @OneToMany('Procedure', 'encounter', { cascade: true })
  procedures!: Procedure[];
}
