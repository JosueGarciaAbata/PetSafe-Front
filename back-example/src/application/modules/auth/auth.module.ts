import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from '../../services/auth/auth.service.js';
import { AuthController } from '../../../presentation/controllers/auth/auth.controller.js';
import { JwtStrategy } from '../../../infra/security/strategies/jwt.strategy.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';

import { User } from '../../../domain/entities/auth/user.entity.js';
import { Role } from '../../../domain/entities/auth/role.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { UserRefreshToken } from '../../../domain/entities/auth/user-refresh-token.entity.js';
import { Person } from '../../../domain/entities/persons/person.entity.js';
import { Client } from '../../../domain/entities/persons/client.entity.js';
import { UserPasswordResetToken } from '../../../domain/entities/auth/user-password-reset.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      UserRefreshToken,
      UserPasswordResetToken,
      Person,
      Client,
    ]),
    UsersModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback_secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    PassportModule,
    TypeOrmModule,
  ],
})
export class AuthModule {}
