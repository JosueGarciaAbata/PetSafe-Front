import { UpsertPetSurgeryRequest } from './pet-surgery.model';

export interface UpdatePetBasicRequest {
  name: string;
  speciesId: number;
  breedId?: number;
  sex: 'MACHO' | 'HEMBRA';
  birthDate?: string;
  currentWeight?: number;
  colorId?: number;
  sterilized: boolean;
  generalAllergies?: string;
  generalHistory?: string;
  surgeries?: UpsertPetSurgeryRequest[];
  image?: File;
}
