// ── Vaccine catalog item ──────────────────────────────────────────────────

export class VaccineCatalogItemDto {
  id!: number;
  name!: string;
  isMandatory!: boolean;
  isRevaccination!: boolean;
  doseOrder!: number | null;
}

// ── Patient vaccine record ────────────────────────────────────────────────

export class PatientVaccineRecordResponseDto {
  id!: number;
  vaccineId!: number;
  vaccineName!: string;
  applicationDate!: string;
  administeredBy!: string | null;
  administeredAt!: string | null;
  isExternal!: boolean;
  batchNumber!: string | null;
  nextDoseDate!: string | null;
  notes!: string | null;
  encounterId!: number | null;
  createdAt!: string;
}

// ── Coverage item (per mandatory vaccine) ────────────────────────────────

export class VaccineCoverageItemDto {
  vaccineId!: number;
  vaccineName!: string;
  doseOrder!: number | null;
  isRevaccination!: boolean;
  /** La última aplicación registrada en el carnet del paciente, null si no la tiene */
  lastApplied!: string | null;
  /** Próxima dosis sugerida según el último registro, null si no aplica */
  nextDoseDate!: string | null;
  /** true = tiene al menos un registro de esta vacuna */
  isCovered!: boolean;
}

// ── Full coverage response ────────────────────────────────────────────────

export class PatientVaccineCoverageResponseDto {
  patientId!: number;
  speciesId!: number;
  speciesName!: string;
  mandatoryVaccines!: VaccineCoverageItemDto[];
  coveragePercent!: number;
}
