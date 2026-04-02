import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { Person } from './person.entity.js';
import type { PatientTutor } from '../patients/patient-tutor.entity.js';

@Entity({ name: 'clients' })
export class Client extends BaseAuditEntity {
  @Column({ name: 'person_id', type: 'int' })
  personId!: number;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'person_id' })
  person!: Person;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany('PatientTutor', 'client')
  patientTutors!: PatientTutor[];
}
