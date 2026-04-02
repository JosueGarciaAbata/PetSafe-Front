import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';

import { ZootecnicalGroupsService } from '../../../application/services/zootecnical-groups/zootecnical-groups.service.js';
import { CreateZootecnicalGroupDto } from '../../dto/zootecnical-groups/create-zootecnical-group.dto.js';
import { UpdateZootecnicalGroupDto } from '../../dto/zootecnical-groups/update-zootecnical-group.dto.js';
import { JwtAuthGuard } from '../../../infra/security/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../infra/security/guards/roles.guard.js';
import { Roles } from '../../../infra/security/decorators/roles.decorator.js';
import { RoleEnum } from '../../../domain/enums/index.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('zootecnical-groups')
export class ZootecnicalGroupsController {
  constructor(private readonly zootecnicalGroupsService: ZootecnicalGroupsService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Post()
  create(@Body() dto: CreateZootecnicalGroupDto) {
    return this.zootecnicalGroupsService.create(dto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get()
  findAll(@Paginate() query: PaginateQuery) {
    return this.zootecnicalGroupsService.findAll(query);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ, RoleEnum.RECEPCIONISTA, RoleEnum.CLIENTE_APP)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zootecnicalGroupsService.findOne(id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MVZ)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZootecnicalGroupDto) {
    return this.zootecnicalGroupsService.update(id, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zootecnicalGroupsService.remove(id);
  }
}
