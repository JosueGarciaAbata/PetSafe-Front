import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Breed } from './breed.entity.js';
import type { ZootecnicalGroup } from './zootecnical-group.entity.js';

@Entity({ name: 'species' })
export class Species extends BaseAuditEntity {
  @Column({ name: 'zootecnical_group_id', type: 'int' })
  zootecnicalGroupId!: number;

  @ManyToOne('ZootecnicalGroup', 'species', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zootecnical_group_id' })
  zootecnicalGroup!: ZootecnicalGroup;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @OneToMany('Breed', 'species')
  breeds!: Breed[];
}
