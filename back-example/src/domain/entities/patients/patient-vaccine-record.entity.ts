import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import type { Patient } from '../patients/patient.entity.js';
import type { Vaccine } from '../catalogs/vaccine.entity.js';
import type { Encounter } from '../encounters/encounter.entity.js';

@Entity({ name: 'patient_vaccine_records' })
export class PatientVaccineRecord {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @ManyToOne('Patient', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'vaccine_id', type: 'int' })
  vaccineId!: number;

  @ManyToOne('Vaccine', { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine!: Vaccine;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate!: Date;

  @Column({ name: 'administered_by', type: 'varchar', length: 120, nullable: true })
  administeredBy!: string | null;

  @Column({ name: 'administered_at', type: 'varchar', length: 180, nullable: true })
  administeredAt!: string | null;

  /** true = vacuna registrada de otra clínica / lugar externo */
  @Column({ name: 'is_external', type: 'boolean', default: false })
  isExternal!: boolean;

  @Column({ name: 'batch_number', type: 'varchar', length: 80, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'next_dose_date', type: 'date', nullable: true })
  nextDoseDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Si fue aplicada en un encounter de esta clínica, referencia opcional */
  @Column({ name: 'encounter_id', type: 'int', nullable: true })
  encounterId!: number | null;

  @ManyToOne('Encounter', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter | null;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp without time zone', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'deleted_by_user_id', type: 'int', nullable: true })
  deletedByUserId!: number | null;
}
