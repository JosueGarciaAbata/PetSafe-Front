import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { UserPasswordResetToken } from '../../../domain/entities/auth/user-password-reset.entity.js';

const TEMPORARY_ACCESS_CHANNEL = 'temporary_access';

@Injectable()
export class TemporaryAccessService {
  constructor(
    @InjectRepository(UserPasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<UserPasswordResetToken>,
  ) {}

  async createForUser(
    userId: number,
    destination: string,
    plainPassword: string,
    manager: EntityManager,
  ): Promise<{ expiresAt: Date; expiresInHours: number }> {
    const expiresInHours = 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.invalidateForUser(userId, manager);

    const token = manager.create(UserPasswordResetToken, {
      userId,
      codeHash: this.hashValue(plainPassword),
      channel: TEMPORARY_ACCESS_CHANNEL,
      destination,
      expiresAt,
      maxAttempts: 1,
    });

    await manager.save(UserPasswordResetToken, token);

    return { expiresAt, expiresInHours };
  }

  async getRequirement(userId: number): Promise<{
    requiresPasswordChange: boolean;
    expired: boolean;
  }> {
    const token = await this.passwordResetTokenRepository.findOne({
      where: {
        userId,
        channel: TEMPORARY_ACCESS_CHANNEL,
      },
      order: { createdAt: 'DESC' },
    });

    if (!token || token.usedAt || token.invalidatedAt) {
      return {
        requiresPasswordChange: false,
        expired: false,
      };
    }

    if (token.expiresAt < new Date()) {
      return {
        requiresPasswordChange: false,
        expired: true,
      };
    }

    return {
      requiresPasswordChange: true,
      expired: false,
    };
  }

  async invalidateForUser(userId: number, manager: EntityManager): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(UserPasswordResetToken)
      .set({ invalidatedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('channel = :channel', { channel: TEMPORARY_ACCESS_CHANNEL })
      .andWhere('used_at IS NULL')
      .andWhere('invalidated_at IS NULL')
      .execute();
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
