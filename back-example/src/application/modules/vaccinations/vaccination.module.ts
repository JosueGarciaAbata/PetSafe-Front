import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VaccinationService } from '../../services/vaccinations/vaccination.service.js';
import { VaccinationController } from '../../../presentation/controllers/vaccinations/vaccination.controller.js';

import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { PatientVaccineRecord } from '../../../domain/entities/patients/patient-vaccine-record.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { Encounter } from '../../../domain/entities/encounters/encounter.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vaccine,
      PatientVaccineRecord,
      Patient,
      Species,
      Encounter,
      UserRole,
    ]),
  ],
  controllers: [VaccinationController],
  providers: [VaccinationService],
  exports: [VaccinationService],
})
export class VaccinationModule {}
