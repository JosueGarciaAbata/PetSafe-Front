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

import { ColorsService } from '../../../application/services/colors/colors.service.js';
import { CreateColorDto } from '../../dto/colors/create-color.dto.js';
import { UpdateColorDto } from '../../dto/colors/update-color.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Post()
  create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get()
  findAll(@Paginate() query: PaginateQuery) {
    return this.colorsService.findAll(query);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.findOne(id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateColorDto) {
    return this.colorsService.update(id, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.remove(id);
  }
}
