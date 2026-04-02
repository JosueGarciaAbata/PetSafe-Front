import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../../domain/entities/auth/user.entity.js';
import { Person } from '../../../domain/entities/persons/person.entity.js';
import { Role } from '../../../domain/entities/auth/role.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { UserPasswordResetToken } from '../../../domain/entities/auth/user-password-reset.entity.js';
import { UsersService } from '../../services/users/users.service.js';
import { TemporaryAccessService } from '../../services/users/temporary-access.service.js';
import { UsersController } from '../../../presentation/controllers/users/users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Person, Role, UserRole, UserPasswordResetToken])],
  controllers: [UsersController],
  providers: [UsersService, TemporaryAccessService],
  exports: [UsersService, TemporaryAccessService],
})
export class UsersModule {}
