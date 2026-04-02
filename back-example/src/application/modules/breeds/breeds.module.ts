import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BreedsService } from '../../services/breeds/breeds.service.js';
import { BreedsController } from '../../../presentation/controllers/breeds/breeds.controller.js';

import { Breed } from '../../../domain/entities/catalogs/breed.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Breed, Species, Patient, UserRole])],
  controllers: [BreedsController],
  providers: [BreedsService],
  exports: [BreedsService],
})
export class BreedsModule {}
