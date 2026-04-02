import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

import { UsersService } from '../../../application/services/users/users.service.js';
import { UpdateProfileDto } from '../../dto/auth/update-profile.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('me')
  getProfile(@Request() req: { user: { userId: number } }) {
    return this.usersService.findProfile(req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Patch('me')
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req: { user: { userId: number } }) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }
}
