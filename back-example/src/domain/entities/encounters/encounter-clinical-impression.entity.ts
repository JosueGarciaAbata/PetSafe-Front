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

@Entity({ name: 'encounter_clinical_impressions' })
export class EncounterClinicalImpression {
  @PrimaryColumn({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @OneToOne('Encounter', 'clinicalImpression', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'presumptive_diagnosis', type: 'text', nullable: true })
  presumptiveDiagnosis!: string | null;

  @Column({ name: 'differential_diagnosis', type: 'text', nullable: true })
  differentialDiagnosis!: string | null;

  @Column({ type: 'text', nullable: true })
  prognosis!: string | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

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
