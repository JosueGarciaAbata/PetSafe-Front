import { Entity, Column, OneToOne } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { GenderEnum, PersonTypeEnum } from '../../enums/index.js';

@Entity({ name: 'persons' })
export class Person extends BaseAuditEntity {
  @Column({
    name: 'person_type',
    type: 'enum',
    enum: PersonTypeEnum,
    enumName: 'person_type_enum',
  })
  personType!: PersonTypeEnum;

  @Column({ name: 'first_name', type: 'varchar', length: 120 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 120 })
  lastName!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 20, nullable: true })
  documentId!: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({
    type: 'enum',
    enum: GenderEnum,
    enumName: 'gender_enum',
    nullable: true,
  })
  gender!: GenderEnum | null;

  @Column({
    name: 'birth_date',
    type: 'date',
    nullable: true,
  })
  birthDate!: Date | null;
}
