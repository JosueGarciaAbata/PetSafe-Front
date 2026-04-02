import { PatientConditionResponseDto } from './patient-response.dto.js';
import { PatientImageResponseDto } from './patient-image.dto.js';

export type PatientBasicByClientResponse = {
  id: number;
  name: string;
  birthDate: Date | null;
  species: {
    id: number;
    name: string;
  } | null;
  breed: {
    id: number;
    name: string;
  } | null;
  color: {
    id: number;
    name: string;
  } | null;
  image: PatientImageResponseDto | null;
};

export type PaginatedPatientsBasicForAdminResponse = {
  data: PatientAdminBasicResponse[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type PatientAdminBasicResponse = {
  id: number;
  name: string;
  species: {
    id: number;
    name: string;
  } | null;
  breed: {
    id: number;
    name: string;
  } | null;
  tutorName: string | null;
  tutorContact: string | null;
  birthDate: Date | null;
  ageYears: number | null;
  sex: string;
  currentWeight: number | null;
  image: PatientImageResponseDto | null;
};

export type PatientAdminBasicDetailResponse = {
  id: number;
  name: string;
  species: {
    id: number;
    name: string;
  } | null;
  breed: {
    id: number;
    name: string;
  } | null;
  sex: string;
  currentWeight: number | null;
  birthDate: Date | null;
  ageYears: number | null;
  color: {
    id: number;
    name: string;
  } | null;
  sterilized: boolean;
  generalAllergies: string | null;
  generalHistory: string | null;
  image: PatientImageResponseDto | null;
  clinicalObservations: PatientConditionResponseDto[];
  recentActivity: null;
};
