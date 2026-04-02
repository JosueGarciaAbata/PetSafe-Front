import { PetImageApiResponse } from './pet-image.model';

export interface PetCreateResponseApiResponse {
  id: number;
  code: string;
  name: string;
  sex: string;
  birthDate: string | null;
  currentWeight: number | null;
  sterilized: boolean;
  microchipCode: string | null;
  distinguishingMarks: string | null;
  generalAllergies: string | null;
  generalHistory: string | null;
  species: PetCreateCatalogApiResponse | null;
  breed: PetCreateCatalogApiResponse | null;
  color: PetCreateCatalogApiResponse | null;
  image: PetImageApiResponse | null;
  conditions: PetCreateConditionApiResponse[];
}

export interface PetCreateCatalogApiResponse {
  id: number;
  name: string;
}

export interface PetCreateConditionApiResponse {
  id: number;
  type: string;
  name: string;
  description: string | null;
  active: boolean;
}
