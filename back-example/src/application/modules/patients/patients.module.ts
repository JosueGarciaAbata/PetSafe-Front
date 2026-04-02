import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PatientsService } from '../../services/patients/patients.service.js';
import { PatientsController } from '../../../presentation/controllers/patients/patients.controller.js';

import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { PatientTutor } from '../../../domain/entities/patients/patient-tutor.entity.js';
import { PatientCondition } from '../../../domain/entities/patients/patient-condition.entity.js';
import { Client } from '../../../domain/entities/persons/client.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { Breed } from '../../../domain/entities/catalogs/breed.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { MediaFile } from '../../../domain/entities/media/media-file.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      PatientTutor,
      PatientCondition,
      Client,
      Species,
      Breed,
      UserRole,
      MediaFile,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
