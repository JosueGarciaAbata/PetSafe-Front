import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';

import { EncountersService } from '../../../application/services/encounters/encounters.service.js';
import { CreateEncounterDto } from '../../dto/encounters/create-encounter.dto.js';
import { CloseEncounterDto } from '../../dto/encounters/update-encounter-status.dto.js';
import { UpsertConsultationReasonDto } from '../../dto/encounters/upsert-consultation-reason.dto.js';
import { UpsertAnamnesisDto } from '../../dto/encounters/upsert-anamnesis.dto.js';
import { UpsertClinicalExamDto } from '../../dto/encounters/upsert-clinical-exam.dto.js';
import { UpsertEnvironmentalDataDto } from '../../dto/encounters/upsert-environmental-data.dto.js';
import { UpsertClinicalImpressionDto } from '../../dto/encounters/upsert-clinical-impression.dto.js';
import { UpsertPlanDto } from '../../dto/encounters/upsert-plan.dto.js';
import { CreateVaccinationEventDto } from '../../dto/encounters/create-vaccination-event.dto.js';
import { CreateDewormingEventDto } from '../../dto/encounters/create-deworming-event.dto.js';
import { CreateTreatmentDto } from '../../dto/encounters/create-treatment.dto.js';
import { CreateSurgeryDto } from '../../dto/encounters/create-surgery.dto.js';
import { CreateProcedureDto } from '../../dto/encounters/create-procedure.dto.js';

import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  // ── Encounter principal ────────────────────────────────────────────────────

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post()
  create(
    @Body() dto: CreateEncounterDto,
    @Request() req: { user: { userId: number; roles: string[] } },
  ) {
    return this.encountersService.create(dto, req.user.userId, req.user.roles);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA)
  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.encountersService.findAll(
      patientId ? Number(patientId) : undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.encountersService.findOne(id);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Patch(':id/close')
  closeEncounter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseEncounterDto,
  ) {
    return this.encountersService.closeEncounter(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Patch(':id/cancel')
  cancelEncounter(@Param('id', ParseIntPipe) id: number) {
    return this.encountersService.cancelEncounter(id);
  }

  // ── Sub-entidades 1:1 (upsert) ─────────────────────────────────────────────

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/consultation-reason')
  upsertConsultationReason(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertConsultationReasonDto,
  ) {
    return this.encountersService.upsertConsultationReason(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/anamnesis')
  upsertAnamnesis(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertAnamnesisDto,
  ) {
    return this.encountersService.upsertAnamnesis(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/clinical-exam')
  upsertClinicalExam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertClinicalExamDto,
  ) {
    return this.encountersService.upsertClinicalExam(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/environmental-data')
  upsertEnvironmentalData(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertEnvironmentalDataDto,
  ) {
    return this.encountersService.upsertEnvironmentalData(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/clinical-impression')
  upsertClinicalImpression(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertClinicalImpressionDto,
  ) {
    return this.encountersService.upsertClinicalImpression(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put(':id/plan')
  upsertPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertPlanDto,
  ) {
    return this.encountersService.upsertPlan(id, dto);
  }

  // ── Eventos 1:N ────────────────────────────────────────────────────────────

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post(':id/vaccinations')
  addVaccination(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVaccinationEventDto,
  ) {
    return this.encountersService.addVaccinationEvent(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post(':id/dewormings')
  addDeworming(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDewormingEventDto,
  ) {
    return this.encountersService.addDewormingEvent(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post(':id/treatments')
  addTreatment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.encountersService.addTreatment(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post(':id/surgeries')
  addSurgery(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSurgeryDto,
  ) {
    return this.encountersService.addSurgery(id, dto);
  }

  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post(':id/procedures')
  addProcedure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProcedureDto,
  ) {
    return this.encountersService.addProcedure(id, dto);
  }
}
