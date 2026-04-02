import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcedureCatalog } from '../../../domain/entities/catalogs/procedure-catalog.entity.js';
import { SurgeryCatalog } from '../../../domain/entities/catalogs/surgery-catalog.entity.js';
import { ProcedureSurgeryCatalogService } from '../../services/catalogs/procedure-surgery-catalog.service.js';
import { ProcedureSurgeryCatalogController } from '../../../presentation/controllers/catalogs/procedure-surgery-catalog.controller.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProcedureCatalog, SurgeryCatalog, UserRole])],
  controllers: [ProcedureSurgeryCatalogController],
  providers: [ProcedureSurgeryCatalogService],
  exports: [ProcedureSurgeryCatalogService],
})
export class ProcedureSurgeryCatalogModule {}
