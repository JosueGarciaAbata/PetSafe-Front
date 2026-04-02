import { Entity, Column, OneToMany } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { UserRole } from './user-role.entity.js';

@Entity({ name: 'roles' })
export class Role extends BaseAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @OneToMany('UserRole', 'role')
  userRoles!: UserRole[];
}
