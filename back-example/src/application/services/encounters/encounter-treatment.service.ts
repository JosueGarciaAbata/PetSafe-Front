import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Treatment } from '../../../domain/entities/encounters/treatment.entity.js';
import { TreatmentItem } from '../../../domain/entities/encounters/treatment-item.entity.js';
import {
  TreatmentItemStatusEnum,
  TreatmentStatusEnum,
} from '../../../domain/enums/index.js';
import { CreateTreatmentDto } from '../../../presentation/dto/encounters/create-treatment.dto.js';

@Injectable()
export class EncounterTreatmentService {
  constructor(
    @InjectRepository(Treatment)
    private readonly treatmentRepo: Repository<Treatment>,
    @InjectRepository(TreatmentItem)
    private readonly treatmentItemRepo: Repository<TreatmentItem>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra un tratamiento y decide su estado inicial según las fechas.
   */
  async addTreatment(encounterId: number, dto: CreateTreatmentDto): Promise<void> {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        'La fecha de fin del tratamiento no puede ser anterior a la fecha de inicio.',
      );
    }

    const treatmentStatus = this.resolveTreatmentStatus(endDate);

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const treatment = manager.create(Treatment, {
        encounterId,
        status: treatmentStatus,
        startDate,
        endDate,
        generalInstructions: dto.generalInstructions ?? null,
      });
      const savedTreatment = await manager.save(Treatment, treatment);

      if (!dto.items?.length) {
        return;
      }

      const items = dto.items.map((item) =>
        manager.create(TreatmentItem, {
          treatmentId: savedTreatment.id,
          medication: item.medication,
          dose: item.dose,
          frequency: item.frequency,
          durationDays: item.durationDays,
          administrationRoute: item.administrationRoute,
          notes: item.notes ?? null,
          status:
            item.status ??
            (treatmentStatus === TreatmentStatusEnum.FINALIZADO
              ? TreatmentItemStatusEnum.FINALIZADO
              : TreatmentItemStatusEnum.ACTIVO),
        }),
      );

      await manager.save(TreatmentItem, items);
    });
  }

  /**
   * Cierra automáticamente tratamientos vencidos junto con sus ítems activos.
   */
  async syncEncounterTreatmentStatuses(encounterId: number): Promise<void> {
    const today = this.normalizeDate(new Date());

    const expiredTreatments = await this.treatmentRepo.find({
      where: {
        encounterId,
        status: TreatmentStatusEnum.ACTIVO,
      },
      relations: ['items'],
    });

    const treatmentsToFinalize = expiredTreatments.filter(
      (treatment) => treatment.endDate && this.normalizeDate(treatment.endDate) <= today,
    );

    if (treatmentsToFinalize.length === 0) {
      return;
    }

    await this.dataSource.transaction(async (manager: EntityManager) => {
      for (const treatment of treatmentsToFinalize) {
        await manager.update(Treatment, treatment.id, {
          status: TreatmentStatusEnum.FINALIZADO,
        });

        const activeItemIds = (treatment.items ?? [])
          .filter((item) => item.status === TreatmentItemStatusEnum.ACTIVO)
          .map((item) => item.id);

        if (activeItemIds.length > 0) {
          await manager.update(TreatmentItem, activeItemIds, {
            status: TreatmentItemStatusEnum.FINALIZADO,
          });
        }
      }
    });
  }

  private resolveTreatmentStatus(endDate: Date | null): TreatmentStatusEnum {
    const today = this.normalizeDate(new Date());
    const normalizedEndDate = endDate ? this.normalizeDate(endDate) : null;

    if (normalizedEndDate && normalizedEndDate <= today) {
      return TreatmentStatusEnum.FINALIZADO;
    }

    return TreatmentStatusEnum.ACTIVO;
  }

  private normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
