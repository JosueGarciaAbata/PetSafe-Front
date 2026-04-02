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
} from '@nestjs/common';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';

import { BreedsService } from '../../../application/services/breeds/breeds.service.js';
import { CreateBreedDto } from '../../dto/breeds/create-breed.dto.js';
import { UpdateBreedDto } from '../../dto/breeds/update-breed.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('breeds')
export class BreedsController {
  constructor(private readonly breedsService: BreedsService) { }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Post()
  create(@Body() dto: CreateBreedDto) {
    return this.breedsService.create(dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get()
  findAll(@Paginate() query: PaginateQuery) {
    return this.breedsService.findAll(query);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.breedsService.findOne(id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBreedDto) {
    return this.breedsService.update(id, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.breedsService.remove(id);
  }
}
