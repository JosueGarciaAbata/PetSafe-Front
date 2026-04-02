import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Encounter } from '../../../domain/entities/encounters/encounter.entity.js';
import { CreateEncounterDto } from '../../../presentation/dto/encounters/create-encounter.dto.js';
import { CloseEncounterDto } from '../../../presentation/dto/encounters/update-encounter-status.dto.js';
import {
  EncounterListItemDto,
  EncounterResponseDto,
} from '../../../presentation/dto/encounters/encounter-response.dto.js';
import { EncounterMapper } from '../../mappers/encounter.mapper.js';
import { EncounterStatusEnum } from '../../../domain/enums/index.js';
import { EncounterSharedService } from './encounter-shared.service.js';
import { EncounterTreatmentService } from './encounter-treatment.service.js';

@Injectable()
export class EncounterCoreService {
  constructor(
    @InjectRepository(Encounter)
    private readonly encounterRepo: Repository<Encounter>,
    private readonly sharedService: EncounterSharedService,
    private readonly treatmentService: EncounterTreatmentService,
  ) {}

  /**
   * Crea una nueva atención clínica validando paciente y veterinario responsable.
   */
  async create(
    dto: CreateEncounterDto,
    userId: number,
    roles: string[],
  ): Promise<EncounterResponseDto> {
    await this.sharedService.findPatientOrFail(dto.patientId);
    await this.sharedService.ensureVetCanCreateEncounter(dto.vetId, userId, roles);

    const encounter = this.encounterRepo.create({
      patientId: dto.patientId,
      vetId: dto.vetId,
      startTime: new Date(dto.startTime),
      appointmentId: dto.appointmentId ?? null,
      queueEntryId: dto.queueEntryId ?? null,
      generalNotes: dto.generalNotes ?? null,
      status: EncounterStatusEnum.ACTIVA,
      createdByUserId: userId,
    });

    const saved = await this.encounterRepo.save(encounter);
    return this.findOne(saved.id);
  }

  /**
   * Lista atenciones con paginación simple y filtro opcional por paciente.
   */
  async findAll(
    patientId?: number,
    page = 1,
    limit = 20,
  ): Promise<{ data: EncounterListItemDto[]; total: number; page: number; limit: number }> {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const qb = this.encounterRepo
      .createQueryBuilder('e')
      .where('e.deleted_at IS NULL')
      .orderBy('e.start_time', 'DESC')
      .skip(skip)
      .take(take);

    if (patientId) {
      qb.andWhere('e.patient_id = :patientId', { patientId });
    }

    const [encounters, total] = await qb.getManyAndCount();

    return {
      data: encounters.map(EncounterMapper.toListItemDto),
      total,
      page: Math.max(page, 1),
      limit: take,
    };
  }

  /**
   * Devuelve la atención completa y sincroniza antes los tratamientos vencidos.
   */
  async findOne(id: number): Promise<EncounterResponseDto> {
    await this.treatmentService.syncEncounterTreatmentStatuses(id);
    const encounter = await this.sharedService.findEncounterOrFail(id);
    return EncounterMapper.toResponseDto(encounter);
  }

  /**
   * Finaliza una atención validando que la hora de cierre no sea inválida.
   */
  async closeEncounter(id: number, dto: CloseEncounterDto): Promise<EncounterResponseDto> {
    const encounter = await this.sharedService.findEncounterOrFail(id);
    this.sharedService.ensureActive(encounter);

    const endTime = new Date(dto.endTime);
    if (endTime < encounter.startTime) {
      throw new BadRequestException(
        'La hora de finalización no puede ser anterior a la hora de inicio.',
      );
    }

    await this.encounterRepo.update(id, {
      status: EncounterStatusEnum.FINALIZADA,
      endTime,
      generalNotes: dto.generalNotes ?? encounter.generalNotes,
    });

    return this.findOne(id);
  }

  /**
   * Anula una atención activa sin eliminar su historial.
   */
  async cancelEncounter(id: number): Promise<EncounterResponseDto> {
    const encounter = await this.sharedService.findEncounterOrFail(id);
    this.sharedService.ensureActive(encounter);

    await this.encounterRepo.update(id, {
      status: EncounterStatusEnum.ANULADA,
    });

    return this.findOne(id);
  }
}
