import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { PatientSexEnum } from '../../enums/index.js';
import { Species } from '../catalogs/species.entity.js';
import { Breed } from '../catalogs/breed.entity.js';
import { Color } from '../catalogs/color.entity.js';
import type { PatientTutor } from './patient-tutor.entity.js';
import type { PatientCondition } from './patient-condition.entity.js';

@Entity({ name: 'patients' })
export class Patient extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 40, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'species_id', type: 'int' })
  speciesId!: number;

  @ManyToOne(() => Species, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'species_id' })
  species!: Species;

  @Column({ name: 'breed_id', type: 'int', nullable: true })
  breedId!: number | null;

  @ManyToOne(() => Breed, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'breed_id' })
  breed!: Breed | null;

  @Column({ name: 'color_id', type: 'int', nullable: true })
  colorId!: number | null;

  @ManyToOne(() => Color, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'color_id' })
  color!: Color | null;

  @Column({
    type: 'enum',
    enum: PatientSexEnum,
    enumName: 'patient_sex_enum',
  })
  sex!: PatientSexEnum;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: Date | null;

  @Column({
    name: 'current_weight',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  currentWeight!: number | null;

  @Column({ name: 'is_sterilized', type: 'boolean', default: false })
  isSterilized!: boolean;

  @Column({
    name: 'microchip_code',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  microchipCode!: string | null;

  @Column({ name: 'distinguishing_marks', type: 'text', nullable: true })
  distinguishingMarks!: string | null;

  @Column({ name: 'general_allergies', type: 'text', nullable: true })
  generalAllergies!: string | null;

  @Column({ name: 'general_history', type: 'text', nullable: true })
  generalHistory!: string | null;

  @OneToMany('PatientTutor', 'patient')
  tutors!: PatientTutor[];

  @OneToMany('PatientCondition', 'patient')
  conditions!: PatientCondition[];
}
