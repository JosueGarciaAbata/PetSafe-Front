import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';

import { VaccinationService } from '../../../application/services/vaccinations/vaccination.service.js';
import { CreateVaccineDto } from '../../dto/vaccinations/create-vaccine.dto.js';
import { UpdateVaccineDto } from '../../dto/vaccinations/update-vaccine.dto.js';
import { UpdateVaccineMandatoryDto } from '../../dto/vaccinations/update-vaccine-mandatory.dto.js';
import { CreatePatientVaccineRecordDto } from '../../dto/vaccinations/create-patient-vaccine-record.dto.js';

import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vaccinations')
export class VaccinationController {
  constructor(private readonly vaccinationService: VaccinationService) {}

  // ─────────────────────────────────────────────────────────────────────────
  //  CATÁLOGO DE VACUNAS — CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /vaccinations/catalog?speciesId=X
   * Lista todas las vacunas del catálogo. Si se pasa ?speciesId filtra por especie.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('catalog')
  getAllVaccines(@Query('speciesId') speciesId?: string) {
    return this.vaccinationService.getAllVaccines(
      speciesId ? Number(speciesId) : undefined,
    );
  }

  /**
   * GET /vaccinations/catalog/:vaccineId
   * Detalle de una vacuna por ID.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('catalog/:vaccineId')
  getOneVaccine(@Param('vaccineId', ParseIntPipe) vaccineId: number) {
    return this.vaccinationService.getOneVaccine(vaccineId);
  }

  /**
   * POST /vaccinations/catalog
   * Crea una nueva vacuna en el catálogo para una especie.
   * Solo MVZ y ADMIN.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post('catalog')
  createVaccine(
    @Body() dto: CreateVaccineDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.vaccinationService.createVaccine(dto, req.user.userId);
  }

  /**
   * PUT /vaccinations/catalog/:vaccineId
   * Actualiza nombre, isRevaccination, isMandatory o doseOrder de una vacuna.
   * Solo MVZ y ADMIN.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Put('catalog/:vaccineId')
  updateVaccine(
    @Param('vaccineId', ParseIntPipe) vaccineId: number,
    @Body() dto: UpdateVaccineDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.vaccinationService.updateVaccine(vaccineId, dto, req.user.userId);
  }

  /**
   * PATCH /vaccinations/catalog/:vaccineId/mandatory
   * Acceso rápido para marcar/desmarcar una vacuna como obligatoria.
   * Solo MVZ y ADMIN.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Patch('catalog/:vaccineId/mandatory')
  updateMandatory(
    @Param('vaccineId', ParseIntPipe) vaccineId: number,
    @Body() dto: UpdateVaccineMandatoryDto,
  ) {
    return this.vaccinationService.updateVaccineMandatory(vaccineId, dto);
  }

  /**
   * DELETE /vaccinations/catalog/:vaccineId
   * Soft-delete de una vacuna con lógica de seguridad en dos niveles:
   *   • RECHAZA si hay vaccination_events activos que la referencian.
   *   • PERMITE con advertencia si solo hay registros en carnets históricos.
   * Solo ADMIN.
   */
  @Roles(RoleEnum.ADMIN)
  @Delete('catalog/:vaccineId')
  deleteVaccine(
    @Param('vaccineId', ParseIntPipe) vaccineId: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.vaccinationService.softDeleteVaccine(vaccineId, req.user.userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ESQUEMA POR ESPECIE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /vaccinations/scheme/:speciesId
   * Retorna las vacunas de la especie ordenadas: obligatorias primero, luego por doseOrder.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('scheme/:speciesId')
  getSchemeBySpecies(@Param('speciesId', ParseIntPipe) speciesId: number) {
    return this.vaccinationService.getVaccinationSchemeBySpecies(speciesId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CARNET DEL PACIENTE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /vaccinations/patients/:patientId/records
   * Historial completo del carnet, ordenado de más reciente a más antiguo.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('patients/:patientId/records')
  getPatientRecords(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.vaccinationService.getPatientVaccineRecord(patientId);
  }

  /**
   * POST /vaccinations/patients/:patientId/records
   * Agrega una vacuna al carnet. Puede ser externa (isExternal: true) o
   * ligada a un encounter interno (encounterId).
   * Solo MVZ y ADMIN.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN)
  @Post('patients/:patientId/records')
  addRecord(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: CreatePatientVaccineRecordDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.vaccinationService.addPatientVaccineRecord(
      patientId,
      dto,
      req.user.userId,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  COBERTURA VACUNAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /vaccinations/patients/:patientId/coverage
   * Retorna qué vacunas obligatorias tiene la especie del paciente,
   * cuáles ya están en su carnet y el % de cobertura.
   */
  @Roles(RoleEnum.MVZ, RoleEnum.ADMIN, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get('patients/:patientId/coverage')
  getCoverage(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.vaccinationService.getPatientVaccineCoverage(patientId);
  }
}
