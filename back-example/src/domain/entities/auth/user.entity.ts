import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import { Person } from '../persons/person.entity.js';
import type { UserRole } from './user-role.entity.js';
import type { UserRefreshToken } from './user-refresh-token.entity.js';
import type { UserPasswordResetToken } from './user-password-reset.entity.js';

@Entity({ name: 'users' })
export class User extends BaseAuditEntity {
  @Column({ name: 'person_id', type: 'int' })
  personId!: number;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'person_id' })
  person!: Person;

  @Column({ type: 'citext' })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({
    name: 'last_login_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @OneToMany('UserRole', 'user')
  userRoles!: UserRole[];

  @OneToMany('UserRefreshToken', 'user')
  refreshTokens!: UserRefreshToken[];

  @OneToMany('UserPasswordResetToken', 'user')
  passwordResetTokens!: UserPasswordResetToken[];
}
