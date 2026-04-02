import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import type { User } from './user.entity.js';
import type { Role } from './role.entity.js';

@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ name: 'role_id', type: 'int' })
  roleId!: number;

  @CreateDateColumn({
    name: 'assigned_at',
    type: 'timestamp without time zone',
  })
  assignedAt!: Date;

  @ManyToOne('User', 'userRoles', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne('Role', 'userRoles', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
