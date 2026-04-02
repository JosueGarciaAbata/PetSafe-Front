import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId: number | undefined = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('No se pudo identificar al usuario');
    }

    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['role'],
    });

    const userRoleNames = userRoles.map((ur) => ur.role.name);
    request.user.roles = userRoleNames;
    const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        'No tiene permisos suficientes para esta acción',
      );
    }

    return true;
  }
}
