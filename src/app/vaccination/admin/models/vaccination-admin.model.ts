export type VaccinationSchemeVersionStatus = 'VIGENTE' | 'REEMPLAZADO' | 'SUSPENDIDO';

export interface VaccinationSpeciesSummary {
  id: number;
  name: string;
}

export interface VaccinationProductItem {
  id: number;
  name: string;
  species: VaccinationSpeciesSummary;
  isRevaccination: boolean;
  isActive: boolean;
}

export interface CreateVaccinationProductRequest {
  name: string;
  speciesId: number;
  isRevaccination?: boolean;
}

export interface UpdateVaccinationProductRequest {
  name?: string;
  isRevaccination?: boolean;
}

export interface VaccinationSchemeDose {
  id: number;
  doseOrder: number;
  vaccineId: number;
  vaccineName: string;
  ageStartWeeks: number | null;
  ageEndWeeks: number | null;
  intervalDays: number | null;
  isRequired: boolean;
  notes: string | null;
}

export interface VaccinationSchemeVersion {
  id: number;
  version: number;
  status: VaccinationSchemeVersionStatus;
  validFrom: string;
  validTo: string | null;
  changeReason: string | null;
  revaccinationRule: string | null;
  generalIntervalDays: number | null;
  doses: VaccinationSchemeDose[];
}

export interface VaccinationScheme {
  id: number;
  name: string;
  description: string | null;
  species: VaccinationSpeciesSummary;
  activeVersionId: number | null;
  versions: VaccinationSchemeVersion[];
}

export interface CreateVaccinationSchemeVersionDoseRequest {
  vaccineId: number;
  doseOrder: number;
  ageStartWeeks?: number;
  ageEndWeeks?: number;
  intervalDays?: number;
  isRequired?: boolean;
  notes?: string;
}

export interface CreateVaccinationSchemeVersionRequest {
  version: number;
  status?: VaccinationSchemeVersionStatus;
  validFrom: string;
  validTo?: string;
  changeReason?: string;
  revaccinationRule?: string;
  generalIntervalDays?: number;
  doses: CreateVaccinationSchemeVersionDoseRequest[];
}

export interface CreateVaccinationSchemeRequest {
  name: string;
  description?: string;
  speciesId: number;
  initialVersion: CreateVaccinationSchemeVersionRequest;
}

export interface UpdateVaccinationSchemeVersionStatusRequest {
  status: VaccinationSchemeVersionStatus;
  validFrom?: string;
  validTo?: string;
  changeReason?: string;
}
