import { PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PetImageApiResponse } from './pet-image.model';

export interface PetListApiResponse {
  data: PetListItemApiResponse[];
  meta: PaginationMeta;
}

export interface PetListItemApiResponse {
  id: number;
  name: string;
  species: PetListSpeciesApiResponse;
  breed: PetListBreedApiResponse;
  tutorName: string;
  tutorContact: string;
  birthDate: string | null;
  ageYears: number | null;
  sex: string;
  currentWeight: number | null;
  image: PetImageApiResponse | null;
}

export interface PetListSpeciesApiResponse {
  id: number;
  name: string;
}

export interface PetListBreedApiResponse {
  id: number;
  name: string;
}

export interface PetListQuery {
  page: number;
  limit: number;
  search?: string;
}
