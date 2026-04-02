import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from '../../../application/services/auth/auth.service.js';
import { RegisterDto } from '../../dto/auth/register.dto.js';
import { LoginDto } from '../../dto/auth/login.dto.js';
import { UpdatePasswordDto } from '../../dto/auth/update-password.dto.js';
import { RefreshTokenDto } from '../../dto/auth/refresh-token.dto.js';
import { LogoutDto } from '../../dto/auth/logout.dto.js';
import { RequestPasswordResetDto } from '../../dto/auth/request-password-reset.dto.js';
import { ConfirmPasswordResetDto } from '../../dto/auth/confirm-password-reset.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Put('change-password')
  updatePassword(
    @Request() req: { user: { userId: number } },
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Post('logout')
  logout(
    @Request() req: { user: { userId: number } },
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(req.user.userId, dto);
  }

  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }
}
