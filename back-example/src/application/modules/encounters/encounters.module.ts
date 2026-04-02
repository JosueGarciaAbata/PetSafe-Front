import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EncountersService } from '../../services/encounters/encounters.service.js';
import { EncounterCoreService } from '../../services/encounters/encounter-core.service.js';
import { EncounterSharedService } from '../../services/encounters/encounter-shared.service.js';
import { EncounterRecordsService } from '../../services/encounters/encounter-records.service.js';
import { EncounterActionsService } from '../../services/encounters/encounter-actions.service.js';
import { EncounterTreatmentService } from '../../services/encounters/encounter-treatment.service.js';
import { EncountersController } from '../../../presentation/controllers/encounters/encounters.controller.js';

import { Encounter } from '../../../domain/entities/encounters/encounter.entity.js';
import { EncounterConsultationReason } from '../../../domain/entities/encounters/encounter-consultation-reason.entity.js';
import { EncounterAnamnesis } from '../../../domain/entities/encounters/encounter-anamnesis.entity.js';
import { EncounterClinicalExam } from '../../../domain/entities/encounters/encounter-clinical-exam.entity.js';
import { EncounterEnvironmentalData } from '../../../domain/entities/encounters/encounter-environmental-data.entity.js';
import { EncounterClinicalImpression } from '../../../domain/entities/encounters/encounter-clinical-impression.entity.js';
import { EncounterPlan } from '../../../domain/entities/encounters/encounter-plan.entity.js';
import { VaccinationEvent } from '../../../domain/entities/encounters/vaccination-event.entity.js';
import { DewormingEvent } from '../../../domain/entities/encounters/deworming-event.entity.js';
import { Treatment } from '../../../domain/entities/encounters/treatment.entity.js';
import { TreatmentItem } from '../../../domain/entities/encounters/treatment-item.entity.js';
import { Surgery } from '../../../domain/entities/encounters/surgery.entity.js';
import { Procedure } from '../../../domain/entities/encounters/procedure.entity.js';
import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { Antiparasitic } from '../../../domain/entities/catalogs/antiparasitic.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { PatientVaccineRecord } from '../../../domain/entities/patients/patient-vaccine-record.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { Employee } from '../../../domain/entities/persons/employee.entity.js';
import { User } from '../../../domain/entities/auth/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Encounter,
      EncounterConsultationReason,
      EncounterAnamnesis,
      EncounterClinicalExam,
      EncounterEnvironmentalData,
      EncounterClinicalImpression,
      EncounterPlan,
      VaccinationEvent,
      DewormingEvent,
      Treatment,
      TreatmentItem,
      Surgery,
      Procedure,
      Vaccine,
      Antiparasitic,
      Patient,
      PatientVaccineRecord,
      UserRole,
      Employee,
      User,
    ]),
  ],
  controllers: [EncountersController],
  providers: [
    EncountersService,
    EncounterCoreService,
    EncounterSharedService,
    EncounterRecordsService,
    EncounterActionsService,
    EncounterTreatmentService,
  ],
  exports: [EncountersService],
})
export class EncountersModule {}
