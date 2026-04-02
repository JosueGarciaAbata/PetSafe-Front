import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ZootecnicalGroup } from '../../../domain/entities/catalogs/zootecnical-group.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { ZootecnicalGroupsService } from '../../services/zootecnical-groups/zootecnical-groups.service.js';
import { ZootecnicalGroupsController } from '../../../presentation/controllers/zootecnical-groups/zootecnical-groups.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ZootecnicalGroup, Species, UserRole])],
  controllers: [ZootecnicalGroupsController],
  providers: [ZootecnicalGroupsService],
  exports: [ZootecnicalGroupsService],
})
export class ZootecnicalGroupsModule {}
