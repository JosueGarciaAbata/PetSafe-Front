import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SpeciesService } from '../../services/species/species.service.js';
import { SpeciesController } from '../../../presentation/controllers/species/species.controller.js';

import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { ZootecnicalGroup } from '../../../domain/entities/catalogs/zootecnical-group.entity.js';
import { Breed } from '../../../domain/entities/catalogs/breed.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Species,
      ZootecnicalGroup,
      Breed,
      Patient,
      Vaccine,
      UserRole,
    ]),
  ],
  controllers: [SpeciesController],
  providers: [SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}
