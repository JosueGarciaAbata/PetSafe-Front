import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import {
  MucosaStatusEnum,
  HydrationStatusEnum,
} from '../../enums/index.js';
import type { Encounter } from './encounter.entity.js';

@Entity({ name: 'encounter_clinical_exams' })
export class EncounterClinicalExam {
  @PrimaryColumn({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @OneToOne('Encounter', 'clinicalExam', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({
    name: 'weight_kg',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  weightKg!: number | null;

  @Column({
    name: 'temperature_c',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  temperatureC!: number | null;

  @Column({ type: 'integer', nullable: true })
  pulse!: number | null;

  @Column({ name: 'heart_rate', type: 'integer', nullable: true })
  heartRate!: number | null;

  @Column({ name: 'respiratory_rate', type: 'integer', nullable: true })
  respiratoryRate!: number | null;

  @Column({
    name: 'mucous_membranes',
    type: 'enum',
    enum: MucosaStatusEnum,
    enumName: 'mucosa_status_enum',
    nullable: true,
  })
  mucousMembranes!: MucosaStatusEnum | null;

  @Column({
    name: 'lymph_nodes',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  lymphNodes!: string | null;

  @Column({
    name: 'hydration',
    type: 'enum',
    enum: HydrationStatusEnum,
    enumName: 'hydration_status_enum',
    nullable: true,
  })
  hydration!: HydrationStatusEnum | null;

  @Column({ name: 'crt_seconds', type: 'integer', nullable: true })
  crtSeconds!: number | null;

  @Column({ name: 'exam_notes', type: 'text', nullable: true })
  examNotes!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  deletedAt!: Date | null;

  @Column({ name: 'deleted_by_user_id', type: 'int', nullable: true })
  deletedByUserId!: number | null;
}
