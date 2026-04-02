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

@Entity({ name: 'encounter_environmental_data' })
export class EncounterEnvironmentalData {
  @PrimaryColumn({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @OneToOne('Encounter', 'environmentalData', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'environment_notes', type: 'text', nullable: true })
  environmentNotes!: string | null;

  @Column({ name: 'nutrition_notes', type: 'text', nullable: true })
  nutritionNotes!: string | null;

  @Column({ name: 'lifestyle_notes', type: 'text', nullable: true })
  lifestyleNotes!: string | null;

  @Column({ name: 'feeding_type_notes', type: 'text', nullable: true })
  feedingTypeNotes!: string | null;

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
