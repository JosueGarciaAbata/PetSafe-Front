import { PetImageApiResponse } from './pet-image.model';
import { PetSurgeryApiResponse } from './pet-surgery.model';
import { ClinicalCaseSummary } from '@app/clinical-cases/models/clinical-case.model';

export interface PetBasicDetailApiResponse {
  id: number;
  name: string;
  qrToken: string | null;
  species: PetDetailCatalogApiResponse | null;
  breed: PetDetailCatalogApiResponse | null;
  sex: string | null;
  currentWeight: number | null;
  birthDate: string | null;
  ageYears: number | null;
  color: PetDetailCatalogApiResponse | null;
  sterilized: boolean | null;
  generalAllergies: string | null;
  generalHistory: string | null;
  image: PetImageApiResponse | null;
  tutors: PetTutorApiResponse[];
  clinicalObservations: PetClinicalObservationApiResponse[];
  surgeries: PetSurgeryApiResponse[];
  procedures: PetProcedureHistoryApiResponse[];
  clinicalCases: ClinicalCaseSummary[];
  recentActivity: PetRecentActivityApiResponse | null;
}

export interface PetDetailCatalogApiResponse {
  id: number;
  name: string;
}

export interface PetClinicalObservationApiResponse {
  id: number;
  type: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface PetTutorApiResponse {
  clientId: number;
  personId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  documentId: string;
  phone: string | null;
  relationship: string | null;
  isPrimary: boolean;
}

export interface AddPetTutorRequest {
  clientId: number;
  isPrimary?: boolean;
  relationship?: string;
}

export interface PetRecentConsultationActivityApiResponse {
  id: number;
  patientConsultationNumber: number;
  startTime: string;
  status: string;
  clinicianName: string | null;
  consultationReason: string | null;
}

export interface PetRecentProcedureActivityApiResponse {
  id: number;
  encounterId: number;
  patientConsultationNumber: number;
  procedureType: string;
  performedDate: string;
  clinicianName: string | null;
}

export interface PetProcedureHistoryApiResponse {
  id: number;
  encounterId: number;
  patientConsultationNumber: number;
  procedureType: string;
  performedDate: string;
  clinicianName: string | null;
  description: string | null;
  result: string | null;
  notes: string | null;
}

export interface PetRecentSurgeryActivityApiResponse {
  id: number;
  encounterId: number | null;
  surgeryType: string;
  activityDate: string;
  surgeryStatus: string;
  clinicianName: string | null;
  isExternal: boolean;
}

export interface PetRecentActivityApiResponse {
  windowStart: string;
  windowEnd: string;
  consultations: PetRecentConsultationActivityApiResponse[];
  procedures: PetRecentProcedureActivityApiResponse[];
  surgeries: PetRecentSurgeryActivityApiResponse[];
}
