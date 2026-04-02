import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity({ name: 'user_refresh_tokens' })
export class UserRefreshToken {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp without time zone',
  })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @Column({
    name: 'revoked_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  revokedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
  })
  createdAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  deletedAt!: Date | null;

  @Column({
    name: 'deleted_by_user_id',
    type: 'int',
    nullable: true,
  })
  deletedByUserId!: number | null;
}
