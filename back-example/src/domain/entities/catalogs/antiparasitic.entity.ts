import { Entity, Column } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { AntiparasiticTypeEnum } from '../../enums/index.js';

@Entity({ name: 'antiparasitics' })
export class Antiparasitic extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({
    type: 'enum',
    enum: AntiparasiticTypeEnum,
    enumName: 'antiparasitic_type_enum',
  })
  type!: AntiparasiticTypeEnum;
}
