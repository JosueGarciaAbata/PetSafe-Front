import { PetImageApiResponse } from './pet-image.model';

export interface PetBasicDetailApiResponse {
  id: number;
  name: string;
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
  recentActivity: unknown | null;
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
