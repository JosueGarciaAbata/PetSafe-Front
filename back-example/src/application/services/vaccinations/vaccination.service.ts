import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';

import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { PatientVaccineRecord } from '../../../domain/entities/patients/patient-vaccine-record.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { Encounter } from '../../../domain/entities/encounters/encounter.entity.js';

import { CreateVaccineDto } from '../../../presentation/dto/vaccinations/create-vaccine.dto.js';
import { UpdateVaccineDto } from '../../../presentation/dto/vaccinations/update-vaccine.dto.js';
import { UpdateVaccineMandatoryDto } from '../../../presentation/dto/vaccinations/update-vaccine-mandatory.dto.js';
import { CreatePatientVaccineRecordDto } from '../../../presentation/dto/vaccinations/create-patient-vaccine-record.dto.js';
import {
  VaccineCatalogItemDto,
  PatientVaccineRecordResponseDto,
  PatientVaccineCoverageResponseDto,
  VaccineCoverageItemDto,
} from '../../../presentation/dto/vaccinations/vaccination-response.dto.js';

const toDateStr = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
};

@Injectable()
export class VaccinationService {
  constructor(
    @InjectRepository(Vaccine)
    private readonly vaccineRepo: Repository<Vaccine>,
    @InjectRepository(PatientVaccineRecord)
    private readonly recordRepo: Repository<PatientVaccineRecord>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Species)
    private readonly speciesRepo: Repository<Species>,
    @InjectRepository(Encounter)
    private readonly encounterRepo: Repository<Encounter>,
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════
  //  CATÁLOGO DE VACUNAS — CRUD
  // ══════════════════════════════════════════════════════════

  /**
   * Lista todas las vacunas del catálogo.
   * Si se filtra por speciesId, retorna solo las de esa especie ordenadas por obligatoriedad.
   */
  async getAllVaccines(speciesId?: number): Promise<VaccineCatalogItemDto[]> {
    const where: Record<string, unknown> = { isActive: true, deletedAt: IsNull() };
    if (speciesId) {
      await this.ensureSpeciesExists(speciesId);
      where['speciesId'] = speciesId;
    }

    const vaccines = await this.vaccineRepo.find({
      where: where as any,
      order: { isMandatory: 'DESC', doseOrder: 'ASC', name: 'ASC' },
    });

    return vaccines.map((v) => this.toVaccineCatalogItem(v));
  }

  /**
   * Detalle de una vacuna por ID.
   */
  async getOneVaccine(vaccineId: number): Promise<VaccineCatalogItemDto> {
    const vaccine = await this.findVaccineOrFail(vaccineId);
    return this.toVaccineCatalogItem(vaccine);
  }

  /**
   * Crea una nueva vacuna en el catálogo.
   * Solo ADMIN / MVZ.
   */
  async createVaccine(dto: CreateVaccineDto, userId: number): Promise<VaccineCatalogItemDto> {
    await this.ensureSpeciesExists(dto.speciesId);

    // Verificar que no exista otra vacuna activa con el mismo nombre en la misma especie
    const existing = await this.vaccineRepo.findOne({
      where: { name: dto.name.trim(), speciesId: dto.speciesId, isActive: true },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `Ya existe una vacuna con el nombre "${dto.name}" para esta especie.`,
      );
    }

    const vaccine = this.vaccineRepo.create({
      name: dto.name.trim(),
      speciesId: dto.speciesId,
      isRevaccination: dto.isRevaccination ?? false,
      isMandatory: dto.isMandatory ?? false,
      doseOrder: dto.doseOrder ?? null,
    });

    // Inyectar deleted_by_user_id queda en BaseAuditEntity, pero created_by no existe
    // en el schema de vacunas; el user que lo creó queda en el audit de la sesión.
    const saved: Vaccine = await this.vaccineRepo.save(vaccine);
    return this.toVaccineCatalogItem(saved);
  }

  /**
   * Actualiza los datos de una vacuna del catálogo.
   * Solo ADMIN / MVZ.
   */
  async updateVaccine(
    vaccineId: number,
    dto: UpdateVaccineDto,
    userId: number,
  ): Promise<VaccineCatalogItemDto> {
    const vaccine = await this.findVaccineOrFail(vaccineId);

    // Verificar nombre único si lo está cambiando
    if (dto.name && dto.name.trim() !== vaccine.name) {
      const duplicate = await this.vaccineRepo.findOne({
        where: { name: dto.name.trim(), speciesId: vaccine.speciesId, isActive: true },
      });
      if (duplicate && !duplicate.deletedAt && duplicate.id !== vaccineId) {
        throw new ConflictException(
          `Ya existe otra vacuna con el nombre "${dto.name}" para esta especie.`,
        );
      }
    }

    const updateData: Partial<Vaccine> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.isRevaccination !== undefined) updateData.isRevaccination = dto.isRevaccination;
    if (dto.isMandatory !== undefined) updateData.isMandatory = dto.isMandatory;
    if (dto.doseOrder !== undefined) updateData.doseOrder = dto.doseOrder;

    await this.vaccineRepo.update(vaccineId, updateData);
    const updated = await this.vaccineRepo.findOneOrFail({ where: { id: vaccineId } });
    return this.toVaccineCatalogItem(updated);
  }

  /**
   * Elimina SUAVEMENTE (soft-delete) una vacuna del catálogo.
   *
   * REGLAS DE SEGURIDAD:
   * ──────────────────────────────────────────────────────────────
   * 1. Si hay vaccination_events activos (en encounters no anulados) que usen
   *    esta vacuna → se RECHAZA la eliminación. Los registros clínicos activos
   *    no deben quedar huérfanos de referencia.
   *
   * 2. Si solo hay patient_vaccine_records (carnet histórico), se PERMITE el
   *    soft-delete pero se devuelve un aviso indicando cuántos registros
   *    históricos hacen referencia a ella. Los datos históricos se conservan
   *    intactos (el FK en DB usa ON DELETE RESTRICT, así que la vacuna nunca
   *    se borra físicamente).
   *
   * 3. Si la vacuna era obligatoria, el soft-delete la retira del esquema de
   *    vacunación de la especie. Los carnets históricos que la registraron
   *    permanecen con esos datos; simplemente dejan de aparecer como "vacuna
   *    obligatoria pendiente" en futuros cálculos de cobertura.
   * ──────────────────────────────────────────────────────────────
   */
  async softDeleteVaccine(
    vaccineId: number,
    userId: number,
  ): Promise<{ message: string; warning: string | null; historicalRecordsCount: number }> {
    const vaccine = await this.findVaccineOrFail(vaccineId);

    // ── 1. Verificar vaccination_events activos ──────────────────────────────
    const activeEventsCount: number = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('vaccination_events', 've')
      .innerJoin('encounters', 'e', 'e.id = ve.encounter_id')
      .where('ve.vaccine_id = :vaccineId', { vaccineId })
      .andWhere('ve.deleted_at IS NULL')
      .andWhere("e.status != 'ANULADA'")
      .andWhere('e.deleted_at IS NULL')
      .getRawOne()
      .then((r: { cnt: string }) => parseInt(r?.cnt ?? '0', 10));

    if (activeEventsCount > 0) {
      throw new ConflictException(
        `No se puede eliminar esta vacuna porque tiene ${activeEventsCount} aplicación(es) registrada(s) en atenciones activas o finalizadas. ` +
          `Si deseas retirarla del esquema de la especie, márcarla primero como no obligatoria (isMandatory: false).`,
      );
    }

    // ── 2. Contar registros históricos en el carnet del paciente ─────────────
    const historicalRecordsCount = await this.recordRepo.count({
      where: { vaccineId, isActive: true, deletedAt: IsNull() },
    });

    // ── 3. Aplicar soft-delete ────────────────────────────────────────────────
    // Marcar is_active = false y deleted_by_user_id antes de softDelete
    await this.vaccineRepo.update(vaccineId, {
      isActive: false,
      deletedByUserId: userId,
    } as any);
    await this.vaccineRepo.softDelete(vaccineId);

    const wasMandatory = vaccine.isMandatory;
    const warningParts: string[] = [];

    if (wasMandatory) {
      warningParts.push(
        'Era una vacuna marcada como OBLIGATORIA. Ha sido retirada del esquema de vacunación de la especie.',
      );
    }
    if (historicalRecordsCount > 0) {
      warningParts.push(
        `Existen ${historicalRecordsCount} registro(s) histórico(s) en carnets de pacientes que hacen referencia a ella. Esos datos se conservan intactos.`,
      );
    }

    return {
      message: `Vacuna "${vaccine.name}" desactivada del catálogo correctamente.`,
      warning: warningParts.length > 0 ? warningParts.join(' ') : null,
      historicalRecordsCount,
    };
  }

  /**
   * Devuelve todas las vacunas de una especie ordenadas por obligatoriedad y dosis.
   */
  async getVaccinationSchemeBySpecies(speciesId: number): Promise<VaccineCatalogItemDto[]> {
    await this.ensureSpeciesExists(speciesId);

    const vaccines = await this.vaccineRepo.find({
      where: { speciesId, isActive: true, deletedAt: IsNull() } as any,
      order: { isMandatory: 'DESC', doseOrder: 'ASC', name: 'ASC' },
    });

    return vaccines.map((v) => this.toVaccineCatalogItem(v));
  }

  /**
   * Marca/desmarca una vacuna como obligatoria y ajusta su orden de dosis.
   * Mantenido por retrocompatibilidad; internamente llama a updateVaccine.
   */
  async updateVaccineMandatory(
    vaccineId: number,
    dto: UpdateVaccineMandatoryDto,
  ): Promise<VaccineCatalogItemDto> {
    const vaccine = await this.findVaccineOrFail(vaccineId);

    await this.vaccineRepo.update(vaccineId, {
      isMandatory: dto.isMandatory,
      doseOrder: dto.doseOrder !== undefined ? dto.doseOrder : vaccine.doseOrder,
    });

    const updated = await this.vaccineRepo.findOneOrFail({ where: { id: vaccineId } });
    return this.toVaccineCatalogItem(updated);
  }

  // ══════════════════════════════════════════════════════════
  //  CARNET DEL PACIENTE
  // ══════════════════════════════════════════════════════════

  /**
   * Historial completo del carnet de vacunación de un paciente.
   */
  async getPatientVaccineRecord(
    patientId: number,
  ): Promise<PatientVaccineRecordResponseDto[]> {
    await this.ensurePatientExists(patientId);

    const records = await this.recordRepo.find({
      where: { patientId },
      relations: ['vaccine'],
      order: { applicationDate: 'DESC' },
    });

    return records
      .filter((r) => !r.deletedAt && r.isActive)
      .map((r) => this.toRecordResponseDto(r));
  }

  /**
   * Agrega una vacuna al carnet del paciente.
   * Puede ser externa (isExternal: true) o ligada a un encounter interno.
   */
  async addPatientVaccineRecord(
    patientId: number,
    dto: CreatePatientVaccineRecordDto,
    userId: number,
  ): Promise<PatientVaccineRecordResponseDto> {
    const patient = await this.findPatientOrFail(patientId);

    // La vacuna debe existir y estar activa
    const vaccine = await this.vaccineRepo.findOne({ where: { id: dto.vaccineId } });
    if (!vaccine || vaccine.deletedAt || !vaccine.isActive) {
      throw new NotFoundException(
        'Vacuna no encontrada en el catálogo. Puede haber sido desactivada; consulta al administrador.',
      );
    }

    this.ensureVaccineMatchesPatientSpecies(vaccine, patient);

    // Si se provee encounter, verificar que existe y corresponde al paciente
    if (dto.encounterId) {
      const encounter = await this.encounterRepo.findOne({
        where: { id: dto.encounterId, patientId },
      });
      if (!encounter || encounter.deletedAt) {
        throw new BadRequestException(
          'El encounter referenciado no existe o no corresponde a este paciente.',
        );
      }
    }

    // Si está ligada a un encounter es siempre interna
    const isExternal = dto.encounterId ? false : (dto.isExternal ?? true);

    const appDate = new Date(dto.applicationDate);
    const nextDate = dto.nextDoseDate ? new Date(dto.nextDoseDate) : null;

    if (nextDate && nextDate < appDate) {
      throw new BadRequestException(
        'La fecha de próxima dosis no puede ser anterior a la fecha de aplicación.',
      );
    }

    const record = this.recordRepo.create({
      patientId,
      vaccineId: dto.vaccineId,
      applicationDate: appDate,
      administeredBy: dto.administeredBy?.trim() ?? null,
      administeredAt: dto.administeredAt?.trim() ?? null,
      isExternal,
      batchNumber: dto.batchNumber?.trim() ?? null,
      nextDoseDate: nextDate,
      notes: dto.notes ?? null,
      encounterId: dto.encounterId ?? null,
      createdByUserId: userId,
    });

    const saved = await this.recordRepo.save(record);
    const full = await this.recordRepo.findOne({
      where: { id: saved.id },
      relations: ['vaccine'],
    });
    return this.toRecordResponseDto(full!);
  }

  // ══════════════════════════════════════════════════════════
  //  COBERTURA VACUNAL
  // ══════════════════════════════════════════════════════════

  /**
   * Compara las vacunas obligatorias de la especie del paciente
   * contra las registradas en su carnet.
   */
  async getPatientVaccineCoverage(
    patientId: number,
  ): Promise<PatientVaccineCoverageResponseDto> {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId },
      relations: ['species'],
    });
    if (!patient || patient.deletedAt) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    // Vacunas obligatorias activas de la especie
    const mandatoryVaccines = await this.vaccineRepo.find({
      where: { speciesId: patient.speciesId, isMandatory: true, isActive: true } as any,
      order: { doseOrder: 'ASC', name: 'ASC' },
    });

    if (mandatoryVaccines.length === 0) {
      return {
        patientId,
        speciesId: patient.speciesId,
        speciesName: patient.species?.name ?? '',
        mandatoryVaccines: [],
        coveragePercent: 100,
      };
    }

    // Carnet activo del paciente
    const records = await this.recordRepo.find({
      where: { patientId, isActive: true },
      order: { applicationDate: 'DESC' },
    });
    const activeRecords = records.filter((r) => !r.deletedAt);

    // Agrupar por vaccineId → último registro aplicado
    const byVaccineId = new Map<number, PatientVaccineRecord>();
    for (const rec of activeRecords) {
      if (!byVaccineId.has(rec.vaccineId)) {
        byVaccineId.set(rec.vaccineId, rec);
      }
    }

    const coverageItems: VaccineCoverageItemDto[] = mandatoryVaccines.map((v) => {
      const latestRecord = byVaccineId.get(v.id);
      return {
        vaccineId: v.id,
        vaccineName: v.name,
        doseOrder: v.doseOrder ?? null,
        isRevaccination: v.isRevaccination,
        lastApplied: latestRecord ? toDateStr(latestRecord.applicationDate) : null,
        nextDoseDate: latestRecord ? toDateStr(latestRecord.nextDoseDate) : null,
        isCovered: !!latestRecord,
      };
    });

    const covered = coverageItems.filter((i) => i.isCovered).length;
    const coveragePercent =
      mandatoryVaccines.length > 0
        ? Math.round((covered / mandatoryVaccines.length) * 100)
        : 100;

    return {
      patientId,
      speciesId: patient.speciesId,
      speciesName: patient.species?.name ?? '',
      mandatoryVaccines: coverageItems,
      coveragePercent,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ══════════════════════════════════════════════════════════

  private async findVaccineOrFail(vaccineId: number): Promise<Vaccine> {
    const vaccine = await this.vaccineRepo.findOne({ where: { id: vaccineId } });
    if (!vaccine || vaccine.deletedAt) {
      throw new NotFoundException('Vacuna no encontrada en el catálogo.');
    }
    return vaccine;
  }

  private async ensurePatientExists(patientId: number): Promise<void> {
    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient || patient.deletedAt) {
      throw new NotFoundException('Paciente no encontrado.');
    }
  }

  private async findPatientOrFail(patientId: number): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { id: patientId }, relations: ['species'] });
    if (!patient || patient.deletedAt) {
      throw new NotFoundException('Paciente no encontrado.');
    }
    return patient;
  }

  private async ensureSpeciesExists(speciesId: number): Promise<void> {
    const species = await this.speciesRepo.findOne({ where: { id: speciesId } });
    if (!species || species.deletedAt) {
      throw new NotFoundException('Especie no encontrada.');
    }
  }

  private toVaccineCatalogItem(v: Vaccine): VaccineCatalogItemDto {
    return {
      id: v.id,
      name: v.name,
      isMandatory: v.isMandatory,
      isRevaccination: v.isRevaccination,
      doseOrder: v.doseOrder ?? null,
    };
  }

  private toRecordResponseDto(r: PatientVaccineRecord): PatientVaccineRecordResponseDto {
    return {
      id: r.id,
      vaccineId: r.vaccineId,
      vaccineName: r.vaccine?.name ?? '',
      applicationDate: toDateStr(r.applicationDate)!,
      administeredBy: r.administeredBy ?? null,
      administeredAt: r.administeredAt ?? null,
      isExternal: r.isExternal,
      batchNumber: r.batchNumber ?? null,
      nextDoseDate: r.nextDoseDate ? toDateStr(r.nextDoseDate) : null,
      notes: r.notes ?? null,
      encounterId: r.encounterId ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  }

  private ensureVaccineMatchesPatientSpecies(vaccine: Vaccine, patient: Patient): void {
    if (vaccine.speciesId !== patient.speciesId) {
      throw new BadRequestException(
        `La vacuna "${vaccine.name}" no corresponde a la especie del paciente.`,
      );
    }
  }
}
