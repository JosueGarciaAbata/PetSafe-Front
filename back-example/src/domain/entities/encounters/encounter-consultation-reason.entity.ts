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
import type { Encounter } from './encounter.entity.js';

@Entity({ name: 'encounter_consultation_reasons' })
export class EncounterConsultationReason {
  @PrimaryColumn({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @OneToOne('Encounter', 'consultationReason', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'consultation_reason', type: 'text' })
  consultationReason!: string;

  @Column({
    name: 'current_illness_history',
    type: 'text',
    nullable: true,
  })
  currentIllnessHistory!: string | null;

  @Column({
    name: 'referred_previous_diagnoses',
    type: 'text',
    nullable: true,
  })
  referredPreviousDiagnoses!: string | null;

  @Column({
    name: 'referred_previous_treatments',
    type: 'text',
    nullable: true,
  })
  referredPreviousTreatments!: string | null;

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
