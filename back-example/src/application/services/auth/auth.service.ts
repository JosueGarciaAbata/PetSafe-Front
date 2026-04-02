import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../../../domain/entities/auth/user.entity.js';
import { UserRefreshToken } from '../../../domain/entities/auth/user-refresh-token.entity.js';
import { UserPasswordResetToken } from '../../../domain/entities/auth/user-password-reset.entity.js';
import { Client } from '../../../domain/entities/persons/client.entity.js';
import { PersonTypeEnum, RoleEnum } from '../../../domain/enums/index.js';

import { RegisterDto } from '../../../presentation/dto/auth/register.dto.js';
import { LoginDto } from '../../../presentation/dto/auth/login.dto.js';
import { RefreshTokenDto } from '../../../presentation/dto/auth/refresh-token.dto.js';
import { LogoutDto } from '../../../presentation/dto/auth/logout.dto.js';
import { UpdatePasswordDto } from '../../../presentation/dto/auth/update-password.dto.js';
import { RequestPasswordResetDto } from '../../../presentation/dto/auth/request-password-reset.dto.js';
import { ConfirmPasswordResetDto } from '../../../presentation/dto/auth/confirm-password-reset.dto.js';
import { AuthResponseDto } from '../../../presentation/dto/auth/auth-response.dto.js';
import { UserMapper } from '../../mappers/user.mapper.js';

import { JwtPayload } from '../../../infra/security/strategies/jwt.strategy.js';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service.js';
import { AuthNotificationContentFactory } from '../notifications/templates/auth-notification-content.factory.js';
import { UsersService } from '../users/users.service.js';
import { TemporaryAccessService } from '../users/temporary-access.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRefreshToken)
    private readonly refreshTokenRepository: Repository<UserRefreshToken>,
    @InjectRepository(UserPasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<UserPasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly notificationContentFactory: AuthNotificationContentFactory,
    private readonly usersService: UsersService,
    private readonly temporaryAccessService: TemporaryAccessService,
  ) {}

  private async generateTokens(user: User, manager?: EntityManager) {
    const roles = user.userRoles?.map((ur) => ur.role.name) || [];

    const payload: JwtPayload = {
      sub: user.id.toString(), // jwt requires string subject usually, or int
      correo: user.email,
      roles,
    };
    const accessToken = this.jwtService.sign(payload);

    const plainRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainRefreshToken).digest('hex');

    const expiresDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? '7', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresDays);

    const tokenData = {
      userId: user.id,
      tokenHash,
      expiresAt,
    };

    if (manager) {
      const entity = manager.create(UserRefreshToken, tokenData);
      await manager.save(UserRefreshToken, entity);
    } else {
      const entity = this.refreshTokenRepository.create(tokenData);
      await this.refreshTokenRepository.save(entity);
    }

    return { accessToken: accessToken, refreshToken: plainRefreshToken };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { savedUser, savedPerson } = await this.usersService.createUserWithRole(
        dto,
        PersonTypeEnum.CLIENTE,
        RoleEnum.CLIENTE_APP,
        manager
      );

      const client = manager.create(Client, {
        personId: savedPerson.id,
      });
      await manager.save(Client, client);

      const tokens = await this.generateTokens(savedUser, manager);

      savedUser.person = savedPerson;
      return UserMapper.toAuthResponseDto(
        savedUser,
        tokens.accessToken,
        tokens.refreshToken,
        false,
      );
    });
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['person', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const temporaryAccess = await this.temporaryAccessService.getRequirement(user.id);
    if (temporaryAccess.expired) {
      throw new UnauthorizedException(
        'La contraseña temporal ha expirado. Debes solicitar una recuperación manual de contraseña.',
      );
    }

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    const tokens = await this.generateTokens(user);

    return UserMapper.toAuthResponseDto(
      user,
      tokens.accessToken,
      tokens.refreshToken,
      temporaryAccess.requiresPasswordChange,
    );
  }

  async updatePassword(userId: number, dto: UpdatePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const salt = await bcrypt.genSalt(10);

    await this.dataSource.transaction(async (manager) => {
      user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
      await manager.save(User, user);
      await this.temporaryAccessService.invalidateForUser(user.id, manager);
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const hash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

    const entity = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hash },
      relations: ['user', 'user.person', 'user.userRoles', 'user.userRoles.role'],
    });

    if (!entity || entity.revoked || entity.expiresAt < new Date()) {
      throw new UnauthorizedException('El token de actualización es inválido, expiró o fue revocado');
    }

    entity.revoked = true;
    entity.revokedAt = new Date();
    await this.refreshTokenRepository.save(entity);

    const temporaryAccess = await this.temporaryAccessService.getRequirement(entity.user.id);
    if (temporaryAccess.expired) {
      throw new UnauthorizedException(
        'La contraseña temporal ha expirado. Debes solicitar una recuperación manual de contraseña.',
      );
    }

    await this.userRepository.update(entity.user.id, {
      lastLoginAt: new Date(),
    });

    const tokens = await this.generateTokens(entity.user);

    return UserMapper.toAuthResponseDto(
      entity.user,
      tokens.accessToken,
      tokens.refreshToken,
      temporaryAccess.requiresPasswordChange,
    );
  }

  async logout(userId: number, dto: LogoutDto) {
    const hash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const entity = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hash, userId: userId },
    });

    if (entity && !entity.revoked) {
      entity.revoked = true;
      entity.revokedAt = new Date();
      await this.refreshTokenRepository.save(entity);
    }

    return { message: 'Sesión cerrada correctamente en este dispositivo' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['person'],
    });

    const genericResponse = {
      message: 'Si el correo existe, se ha enviado un PIN de recuperación con instrucciones.',
    };

    if (!user) {
      return genericResponse;
    }

    const expiresInMinutes = this.getPasswordResetExpiryMinutes();
    const maxAttempts = this.getPasswordResetMaxAttempts();
    const pinLength = this.getPasswordResetPinLength();
    const pin = this.generateNumericPin(pinLength);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const resetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      codeHash: this.hashValue(pin),
      channel: 'email',
      destination: user.email,
      expiresAt,
      maxAttempts,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(UserPasswordResetToken)
        .set({ invalidatedAt: new Date() })
        .where('user_id = :userId', { userId: user.id })
        .andWhere('used_at IS NULL')
        .andWhere('invalidated_at IS NULL')
        .execute();

      await manager.save(UserPasswordResetToken, resetToken);
    });

    try {
      await this.notificationDispatcher.send(
        this.notificationContentFactory.buildPasswordResetPinMessage({
          email: user.email,
          fullName: `${user.person.firstName} ${user.person.lastName}`.trim(),
          pin,
          expiresInMinutes,
        }),
      );
    } catch (error) {
      await this.passwordResetTokenRepository.update(resetToken.id, {
        invalidatedAt: new Date(),
      });
      throw error;
    }

    return genericResponse;
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('El PIN es inválido o ha expirado');
    }

    const token = await this.passwordResetTokenRepository.findOne({
      where: { userId: user.id, channel: 'email' },
      order: { createdAt: 'DESC' },
    });

    if (!token || !this.isPasswordResetTokenUsable(token)) {
      throw new UnauthorizedException('El PIN es inválido o ha expirado');
    }

    if (token.codeHash !== this.hashValue(dto.code)) {
      token.attempts += 1;
      if (token.attempts >= token.maxAttempts) {
        token.invalidatedAt = new Date();
      }
      await this.passwordResetTokenRepository.save(token);
      throw new UnauthorizedException('El PIN es inválido o ha expirado');
    }

    const salt = await bcrypt.genSalt(10);
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    await this.dataSource.transaction(async (manager) => {
      token.usedAt = new Date();
      await manager.save(UserPasswordResetToken, token);

      user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
      await manager.save(User, user);
      await this.temporaryAccessService.invalidateForUser(user.id, manager);

      await manager
        .createQueryBuilder()
        .update(UserRefreshToken)
        .set({
          revoked: true,
          revokedAt: new Date(),
        })
        .where('user_id = :userId', { userId: user.id })
        .andWhere('revoked = false')
        .execute();
    });

    return {
      message: 'La contraseña se restableció correctamente. Por favor, inicia sesión nuevamente.',
    };
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private generateNumericPin(length: number): string {
    let pin = '';
    while (pin.length < length) {
      pin += crypto.randomInt(0, 10).toString();
    }
    return pin.slice(0, length);
  }

  private getPasswordResetExpiryMinutes(): number {
    return parseInt(process.env.PASSWORD_RESET_PIN_EXPIRES_IN_MINUTES ?? '10', 10);
  }

  private getPasswordResetMaxAttempts(): number {
    return parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? '5', 10);
  }

  private getPasswordResetPinLength(): number {
    return parseInt(process.env.PASSWORD_RESET_PIN_LENGTH ?? '6', 10);
  }

  private isPasswordResetTokenUsable(token: UserPasswordResetToken): boolean {
    return (
      token.usedAt === null &&
      token.invalidatedAt === null &&
      token.expiresAt >= new Date() &&
      token.attempts < token.maxAttempts
    );
  }
}
