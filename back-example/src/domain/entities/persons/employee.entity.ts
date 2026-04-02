import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { Person } from './person.entity.js';

@Entity({ name: 'employees' })
export class Employee extends BaseAuditEntity {
  @Column({ name: 'person_id', type: 'int' })
  personId!: number;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'person_id' })
  person!: Person;

  @Column({ type: 'varchar', length: 40, nullable: true })
  code!: string | null;

  @Column({ name: 'job_title', type: 'varchar', length: 120, nullable: true })
  position!: string | null;

  @Column({
    name: 'professional_license',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  professionalRegistration!: string | null;

  @Column({ name: 'is_vet', type: 'boolean', default: false })
  isVeterinarian!: boolean;

  @Column({
    name: 'hire_date',
    type: 'date',
    nullable: true,
  })
  hireDate!: Date | null;
}
