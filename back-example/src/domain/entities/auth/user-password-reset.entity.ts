import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity({ name: 'user_password_reset_tokens' })
export class UserPasswordResetToken {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash!: string;

  @Column({ name: 'channel', type: 'varchar', length: 30, default: 'email' })
  channel!: string;

  @Column({ name: 'destination', type: 'varchar', length: 255 })
  destination!: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp without time zone',
  })
  expiresAt!: Date;

  @Column({
    name: 'used_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  usedAt!: Date | null;

  @Column({
    name: 'invalidated_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  invalidatedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 5 })
  maxAttempts!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
  })
  createdAt!: Date;
}
