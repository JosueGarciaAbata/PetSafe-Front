import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';

import { SpeciesService } from '../../../application/services/species/species.service.js';
import { CreateSpeciesDto } from '../../dto/species/create-species.dto.js';
import { UpdateSpeciesDto } from '../../dto/species/update-species.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Post()
  create(@Body() dto: CreateSpeciesDto) {
    return this.speciesService.create(dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get()
  findAll(@Paginate() query: PaginateQuery) {
    return this.speciesService.findAll(query);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.speciesService.findOne(id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpeciesDto) {
    return this.speciesService.update(id, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.speciesService.remove(id);
  }
}
