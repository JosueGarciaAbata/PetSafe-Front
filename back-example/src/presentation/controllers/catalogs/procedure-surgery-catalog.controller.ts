import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  Request,
} from '@nestjs/common';
import { ProcedureSurgeryCatalogService } from '../../../application/services/catalogs/procedure-surgery-catalog.service.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

import { CreateProcedureCatalogDto } from '../../dto/catalogs/create-procedure-catalog.dto.js';
import { UpdateProcedureCatalogDto } from '../../dto/catalogs/update-procedure-catalog.dto.js';
import { CreateSurgeryCatalogDto } from '../../dto/catalogs/create-surgery-catalog.dto.js';
import { UpdateSurgeryCatalogDto } from '../../dto/catalogs/update-surgery-catalog.dto.js';

@Controller('catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcedureSurgeryCatalogController {
  constructor(private readonly catalogService: ProcedureSurgeryCatalogService) {}

  // ── PROCEDURES CATALOG ──────────────────────────────────────────────────

  @Post('procedures')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  createProcedure(
    @Body() dto: CreateProcedureCatalogDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.createProcedureItem(req.user.userId, dto);
  }

  @Get('procedures')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  findAllProcedures(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.catalogService.findAllProcedures(includeInactive || false);
  }

  @Get('procedures/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  findProcedureById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.findProcedureById(id);
  }

  @Patch('procedures/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  updateProcedure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcedureCatalogDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.updateProcedureItem(id, req.user.userId, dto);
  }

  @Delete('procedures/:id')
  @Roles(RoleEnum.ADMIN)
  removeProcedure(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.softDeleteProcedureItem(id, req.user.userId);
  }

  // ── SURGERIES CATALOG ───────────────────────────────────────────────────

  @Post('surgeries')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  createSurgery(
    @Body() dto: CreateSurgeryCatalogDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.createSurgeryItem(req.user.userId, dto);
  }

  @Get('surgeries')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  findAllSurgeries(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.catalogService.findAllSurgeries(includeInactive || false);
  }

  @Get('surgeries/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  findSurgeryById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.findSurgeryById(id);
  }

  @Patch('surgeries/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  updateSurgery(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurgeryCatalogDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.updateSurgeryItem(id, req.user.userId, dto);
  }

  @Delete('surgeries/:id')
  @Roles(RoleEnum.ADMIN)
  removeSurgery(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.catalogService.softDeleteSurgeryItem(id, req.user.userId);
  }
}
