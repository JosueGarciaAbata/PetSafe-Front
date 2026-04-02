import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';
import { FileInterceptor } from '@nestjs/platform-express';

import { PatientsService } from '../../../application/services/patients/patients.service.js';
import { CreatePatientDto } from '../../dto/patients/create-patient.dto.js';
import { UpdatePatientDto } from '../../dto/patients/update-patient.dto.js';
import { CreateConditionDto } from '../../dto/patients/create-condition.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';
import { ListPatientTutorQueryDto } from '../../dto/patients/list-patient-tutor-query.dto.js';
import { ListPatientTutorResponseDto } from '../../dto/patients/list-patient-tutor-response.dto.js';
import { PatientResponseDto } from '../../dto/patients/patient-response.dto.js';
import { PaginatedPatientsBasicForAdminResponse, PatientAdminBasicDetailResponse } from '../../dto/patients/patient-basic-response.dto.js';
import {
  PATIENT_UPLOADS_URL_PREFIX,
  patientImageUploadOptions,
} from '../../../infra/config/uploads.config.js';

type PatientImageRequest = {
  user: { userId: number; roles?: string[] };
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Post()
  @UseInterceptors(FileInterceptor('image', patientImageUploadOptions))
  create(
    @Body() dto: CreatePatientDto,
    @UploadedFile() imageFile: any,
    @Request() req: PatientImageRequest,
  ) {
    return this.patientsService.create(
      dto,
      req.user.userId,
      req.user.roles ?? [],
      imageFile,
      this.buildPatientImageBaseUrl(req),
    );
  }

  // Todos los pacientes con su info basica y paginada
  @Roles(RoleEnum.ADMIN)
  @Get('admin/all-basic')
  findAllBasic(@Paginate() query: PaginateQuery): Promise<PaginatedPatientsBasicForAdminResponse> {
    return this.patientsService.findAllBasic(query);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get()
  findAll(
    @Paginate() query: PaginateQuery,
    @Request() req: { user: { userId: number } },
  ) {
    return this.patientsService.findAllByUser(query, req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.patientsService.findOne(id, req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', patientImageUploadOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @UploadedFile() imageFile: any,
    @Request() req: PatientImageRequest,
  ) {
    return this.patientsService.update(
      id,
      dto,
      req.user.userId,
      imageFile,
      this.buildPatientImageBaseUrl(req),
    );
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.patientsService.softDelete(id, req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Post(':id/conditions')
  addCondition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateConditionDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.patientsService.addCondition(id, dto, req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Delete(':id/conditions/:conditionId')
  removeCondition(
    @Param('id', ParseIntPipe) id: number,
    @Param('conditionId', ParseIntPipe) conditionId: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.patientsService.removeCondition(id, conditionId, req.user.userId);
  }

  // Todos los pacientes en base a un tutor especifico
  @Roles(RoleEnum.ADMIN)
  @Get('admin/by-client/:clientId')
  findAllByClientId(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Request() req: { user: { userId: number; roles: string[] } },
  ) {
    return this.patientsService.findAllByClientId(
      clientId,
      req.user.userId,
      req.user.roles,
    );
  }

  // Esto creo q era para el detalle de un paciente en el frontend
  @Roles(RoleEnum.ADMIN)
  @Get('admin/:id/basic')
  findAdminBasic(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { userId: number; roles: string[] } }): Promise<PatientAdminBasicDetailResponse> {
    return this.patientsService.findAdminBasic(id, req.user.roles);
  }

  // Actualizar campos basicos de un paciente
  @Roles(RoleEnum.ADMIN)
  @Patch('admin/:id/basic')
  @UseInterceptors(FileInterceptor('image', patientImageUploadOptions))
  updateAdminBasic(
    @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto, @UploadedFile() imageFile: any, @Request() req: PatientImageRequest): Promise<PatientResponseDto> {
    return this.patientsService.updateAdminBasic(
      id,
      dto,
      req.user.userId,
      req.user.roles ?? [],
      imageFile,
      this.buildPatientImageBaseUrl(req),
    );
  }

  // Se utiliza en la parte de citas, para mostrar un resumen de los pacientes y tutores de manera basica y poder seleccionar al momento de generar una cita.
  @Roles(RoleEnum.ADMIN)
  @Get('admin/search-summary')
  searchSummary(@Query() query: ListPatientTutorQueryDto, @Request() req: { user: { userId: number; roles: string[] } }): Promise<ListPatientTutorResponseDto[]> {
    return this.patientsService.findSearchSummary(query, req.user.roles);
  }

  private buildPatientImageBaseUrl(req: {
    protocol?: string;
    headers?: Record<string, string | string[] | undefined>;
    get?: (name: string) => string | undefined;
  }): string {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto || req.protocol || 'http';
    const host = req.get?.('host') || 'localhost:3000';
    return `${protocol}://${host}${PATIENT_UPLOADS_URL_PREFIX}`;
  }
}
