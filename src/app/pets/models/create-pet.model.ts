import { UpsertPetSurgeryRequest } from './pet-surgery.model';

export interface CreatePetRequest {
  clientId?: number;
  name: string;
  speciesId: number;
  vaccinationSchemeId?: number;
  breedId?: number;
  colorId?: number;
  microchipCode?: string;
  sex: 'MACHO' | 'HEMBRA';
  birthDate?: string;
  currentWeight?: number;
  sterilized?: boolean;
  generalAllergies?: string;
  generalHistory?: string;
  surgeries?: UpsertPetSurgeryRequest[];
  image?: File;
}

export interface CreatePetWithoutTutorRequest {
  name: string;
  speciesId: number;
  vaccinationSchemeId?: number;
  sex: 'MACHO' | 'HEMBRA';
  breedId?: number;
  colorId?: number;
  birthDate?: string;
  currentWeight?: number;
  sterilized?: boolean;
  microchipCode?: string;
  distinguishingMarks?: string;
  generalAllergies?: string;
  generalHistory?: string;
  surgeries?: UpsertPetSurgeryRequest[];
  image?: File;
}
