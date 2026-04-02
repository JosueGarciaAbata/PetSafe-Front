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
  AppetiteStatusEnum,
  WaterIntakeStatusEnum,
} from '../../enums/index.js';
import type { Encounter } from './encounter.entity.js';

@Entity({ name: 'encounter_anamnesis' })
export class EncounterAnamnesis {
  @PrimaryColumn({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @OneToOne('Encounter', 'anamnesis', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'problem_start_text', type: 'text', nullable: true })
  problemStartText!: string | null;

  @Column({ name: 'previous_surgeries_text', type: 'text', nullable: true })
  previousSurgeriesText!: string | null;

  @Column({ name: 'how_problem_started_text', type: 'text', nullable: true })
  howProblemStartedText!: string | null;

  @Column({ name: 'vaccines_up_to_date', type: 'boolean', nullable: true })
  vaccinesUpToDate!: boolean | null;

  @Column({ name: 'deworming_up_to_date', type: 'boolean', nullable: true })
  dewormingUpToDate!: boolean | null;

  @Column({ name: 'has_pet_at_home', type: 'boolean', nullable: true })
  hasPetAtHome!: boolean | null;

  @Column({ name: 'pet_at_home_detail', type: 'text', nullable: true })
  petAtHomeDetail!: string | null;

  @Column({
    name: 'administered_medication_text',
    type: 'text',
    nullable: true,
  })
  administeredMedicationText!: string | null;

  @Column({
    name: 'appetite_status',
    type: 'enum',
    enum: AppetiteStatusEnum,
    enumName: 'appetite_status_enum',
    nullable: true,
  })
  appetiteStatus!: AppetiteStatusEnum | null;

  @Column({
    name: 'water_intake_status',
    type: 'enum',
    enum: WaterIntakeStatusEnum,
    enumName: 'water_intake_status_enum',
    nullable: true,
  })
  waterIntakeStatus!: WaterIntakeStatusEnum | null;

  @Column({ name: 'feces_text', type: 'text', nullable: true })
  fecesText!: string | null;

  @Column({ name: 'vomit_text', type: 'text', nullable: true })
  vomitText!: string | null;

  @Column({ name: 'number_of_bowel_movements', type: 'integer', nullable: true })
  numberOfBowelMovements!: number | null;

  @Column({ name: 'urine_text', type: 'text', nullable: true })
  urineText!: string | null;

  @Column({
    name: 'respiratory_problems_text',
    type: 'text',
    nullable: true,
  })
  respiratoryProblemsText!: string | null;

  @Column({ name: 'difficulty_walking_text', type: 'text', nullable: true })
  difficultyWalkingText!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

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
