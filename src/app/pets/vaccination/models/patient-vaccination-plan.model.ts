export type PatientVaccinationDoseStatus =
  | 'APLICADA'
  | 'DESCONOCIDA'
  | 'NO_APLICADA'
  | 'BLOQUEADA'
  | 'REQUIERE_REVISION';

export interface VaccinationSpeciesSummary {
  id: number;
  name: string;
}

export interface VaccineCatalogItem {
  id: number;
  name: string;
  species: VaccinationSpeciesSummary;
  isRevaccination: boolean;
  isActive: boolean;
}

export interface PatientVaccineRecord {
  id: number;
  vaccineId: number;
  vaccineName: string;
  species: VaccinationSpeciesSummary | null;
  applicationDate: string;
  administeredByEmployeeId: number | null;
  administeredBy: string | null;
  administeredAt: string | null;
  isExternal: boolean;
  batchNumber: string | null;
  nextDoseDate: string | null;
  notes: string | null;
  encounterId: number | null;
  planDoseId: number | null;
  createdAt: string;
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
  status: string;
  validFrom: string;
  validTo: string | null;
  changeReason: string | null;
  revaccinationRule: string | null;
  generalIntervalDays: number | null;
  doses: VaccinationSchemeDose[];
}

export interface PatientVaccinationPlanDose {
  id: number;
  schemeDoseId: number;
  vaccineId: number;
  vaccineName: string;
  doseOrder: number;
  status: PatientVaccinationDoseStatus;
  expectedDate: string | null;
  appliedAt: string | null;
  applicationRecordId: number | null;
  ageStartWeeks: number | null;
  ageEndWeeks: number | null;
  intervalDays: number | null;
  isRequired: boolean;
  notes: string | null;
}

export interface PatientVaccinationPlanCoverage {
  totalRequired: number;
  applied: number;
  unknown: number;
  notApplied: number;
  blocked: number;
  requiresReview: number;
  coveragePercent: number;
}

export interface PatientVaccinationPlan {
  id: number;
  patientId: number;
  status: string;
  assignedAt: string;
  notes: string | null;
  scheme: {
    id: number;
    name: string;
    species: VaccinationSpeciesSummary;
  };
  version: VaccinationSchemeVersion;
  doses: PatientVaccinationPlanDose[];
  applications: PatientVaccineRecord[];
  coverage: PatientVaccinationPlanCoverage;
  alerts: string[];
}

export interface CreatePatientVaccineApplicationRequest {
  vaccineId: number;
  applicationDate: string;
  administeredByEmployeeId?: number;
  administeredAt?: string;
  isExternal?: boolean;
  batchNumber?: string;
  nextDoseDate?: string;
  notes?: string;
}

export interface ChangePatientVaccinationSchemeRequest {
  mode: 'CHANGE_SCHEME' | 'REFRESH_CURRENT';
  vaccinationSchemeId?: number;
  notes?: string;
}
