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
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientsService } from '../../../application/services/clients/clients.service.js';
import { ClientAccessService } from '../../../application/services/clients/client-access.service.js';
import { CreateClientDto } from '../../dto/clients/create-client.dto.js';
import { ClientAccessDto } from '../../dto/clients/client-access.dto.js';
import { UpdateClientDto } from '../../dto/clients/update-client.dto.js';
import { ListBasicTutorsQueryDto } from '../../dto/clients/list-basic-tutors-query.dto.js';
import { ListClientsQueryDto } from '../../dto/clients/list-clients-query.dto.js';
import { ListClientSummaryQueryDto } from '../../dto/clients/list-client-summary-query.dto.js';
import { PaginatedClientSummaryResponse } from '../../dto/clients/client-summary-response.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';
import { BasicTutorResponse, ClientSummaryItem } from 'src/presentation/dto/clients/client-summary-response.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly clientAccessService: ClientAccessService,
  ) { }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  @Post(':id/access')
  createAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClientAccessDto,
  ) {
    return this.clientAccessService.createAccessForExistingClient(id, dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  @Get()
  findAll(
    @Query() query: ListClientsQueryDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.clientsService.findAll(query, req.user.userId);
  }

  // Obtener un cliente especifico
  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.clientsService.findOne(id, req.user.userId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.clientsService.remove(id, req.user.userId);
  }

  // Para la tabla de propietarios en el frontend
  @Roles(RoleEnum.ADMIN)
  @Get('admin/summary/list') findSummaryList(@Query() query: ListClientSummaryQueryDto): Promise<PaginatedClientSummaryResponse> {
    return this.clientsService.findSummaryList(query);
  }

  // Para el selector de tutores en el frontend en la seccion de mascotas
  @Roles(RoleEnum.ADMIN)
  @Get('admin/tutors/basic')
  findBasicTutors(@Query() query: ListBasicTutorsQueryDto): Promise<BasicTutorResponse[]> {
    return this.clientsService.findBasicTutors(query);
  }
}
