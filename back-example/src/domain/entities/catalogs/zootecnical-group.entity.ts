import { Column, Entity, OneToMany } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Species } from './species.entity.js';

@Entity({ name: 'zootecnical_groups' })
export class ZootecnicalGroup extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @OneToMany('Species', 'zootecnicalGroup')
  species!: Species[];
}
