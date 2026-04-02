import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { VaccinationEvent } from '../../../domain/entities/encounters/vaccination-event.entity.js';
import { DewormingEvent } from '../../../domain/entities/encounters/deworming-event.entity.js';
import { Surgery } from '../../../domain/entities/encounters/surgery.entity.js';
import { Procedure } from '../../../domain/entities/encounters/procedure.entity.js';
import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { Antiparasitic } from '../../../domain/entities/catalogs/antiparasitic.entity.js';
import { PatientVaccineRecord } from '../../../domain/entities/patients/patient-vaccine-record.entity.js';
import { SurgeryStatusEnum } from '../../../domain/enums/index.js';
import { CreateVaccinationEventDto } from '../../../presentation/dto/encounters/create-vaccination-event.dto.js';
import { CreateDewormingEventDto } from '../../../presentation/dto/encounters/create-deworming-event.dto.js';
import { CreateSurgeryDto } from '../../../presentation/dto/encounters/create-surgery.dto.js';
import { CreateProcedureDto } from '../../../presentation/dto/encounters/create-procedure.dto.js';
import { EncounterSharedService } from './encounter-shared.service.js';

@Injectable()
export class EncounterActionsService {
  constructor(
    @InjectRepository(VaccinationEvent)
    private readonly vaccinationRepo: Repository<VaccinationEvent>,
    @InjectRepository(DewormingEvent)
    private readonly dewormingRepo: Repository<DewormingEvent>,
    @InjectRepository(Surgery)
    private readonly surgeryRepo: Repository<Surgery>,
    @InjectRepository(Procedure)
    private readonly procedureRepo: Repository<Procedure>,
    @InjectRepository(Vaccine)
    private readonly vaccineRepo: Repository<Vaccine>,
    @InjectRepository(Antiparasitic)
    private readonly antiparasiticRepo: Repository<Antiparasitic>,
    @InjectRepository(PatientVaccineRecord)
    private readonly patientVaccineRecordRepo: Repository<PatientVaccineRecord>,
    private readonly dataSource: DataSource,
    private readonly sharedService: EncounterSharedService,
  ) {}

  /**
   * Registra una vacuna aplicada en consulta y la replica al carnet permanente.
   */
  async addVaccinationEvent(
    encounterId: number,
    dto: CreateVaccinationEventDto,
  ): Promise<void> {
    const encounter = await this.sharedService.findEncounterOrFail(encounterId);
    this.sharedService.ensureActive(encounter);

    const vaccine = await this.vaccineRepo.findOne({ where: { id: dto.vaccineId } });
    if (!vaccine || vaccine.deletedAt || !vaccine.isActive) {
      throw new NotFoundException('Vacuna no encontrada en el catálogo.');
    }

    await this.sharedService.ensureVaccineMatchesPatientSpecies(vaccine, encounter.patientId);

    const event = this.vaccinationRepo.create({
      encounterId,
      vaccineId: dto.vaccineId,
      applicationDate: new Date(dto.applicationDate),
      suggestedNextDate: dto.suggestedNextDate ? new Date(dto.suggestedNextDate) : null,
      notes: dto.notes ?? null,
    });

    const carnetRecord = this.patientVaccineRecordRepo.create({
      patientId: encounter.patientId,
      vaccineId: dto.vaccineId,
      applicationDate: new Date(dto.applicationDate),
      administeredBy: 'Veterinario en Consulta',
      isExternal: false,
      nextDoseDate: dto.suggestedNextDate ? new Date(dto.suggestedNextDate) : null,
      notes: dto.notes ?? 'Aplicada en consulta médica',
      encounterId: encounter.id,
      createdByUserId: encounter.createdByUserId,
    });

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.save(VaccinationEvent, event);
      await manager.save(PatientVaccineRecord, carnetRecord);
    });
  }

  /**
   * Registra una desparasitación aplicada durante la atención.
   */
  async addDewormingEvent(
    encounterId: number,
    dto: CreateDewormingEventDto,
  ): Promise<void> {
    const encounter = await this.sharedService.findEncounterOrFail(encounterId);
    this.sharedService.ensureActive(encounter);

    const product = await this.antiparasiticRepo.findOne({ where: { id: dto.productId } });
    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException('Antiparasitario no encontrado en el catálogo.');
    }

    const event = this.dewormingRepo.create({
      encounterId,
      productId: dto.productId,
      applicationDate: new Date(dto.applicationDate),
      suggestedNextDate: dto.suggestedNextDate ? new Date(dto.suggestedNextDate) : null,
      notes: dto.notes ?? null,
    });

    await this.dewormingRepo.save(event);
  }

  /**
   * Registra una cirugía asociada a la atención actual.
   */
  async addSurgery(encounterId: number, dto: CreateSurgeryDto): Promise<void> {
    const encounter = await this.sharedService.findEncounterOrFail(encounterId);
    this.sharedService.ensureActive(encounter);

    const surgery = this.surgeryRepo.create({
      encounterId,
      surgeryType: dto.surgeryType,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      performedDate: dto.performedDate ? new Date(dto.performedDate) : null,
      surgeryStatus: dto.surgeryStatus ?? SurgeryStatusEnum.PROGRAMADA,
      description: dto.description ?? null,
      postoperativeInstructions: dto.postoperativeInstructions ?? null,
    });

    await this.surgeryRepo.save(surgery);
  }

  /**
   * Registra un procedimiento clínico realizado durante la atención.
   */
  async addProcedure(encounterId: number, dto: CreateProcedureDto): Promise<void> {
    const encounter = await this.sharedService.findEncounterOrFail(encounterId);
    this.sharedService.ensureActive(encounter);

    const procedure = this.procedureRepo.create({
      encounterId,
      procedureType: dto.procedureType,
      performedDate: new Date(dto.performedDate),
      description: dto.description ?? null,
      result: dto.result ?? null,
      notes: dto.notes ?? null,
    });

    await this.procedureRepo.save(procedure);
  }
}
