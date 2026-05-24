import { UpsertPetSurgeryRequest } from './pet-surgery.model';

export interface UpdatePetBasicRequest {
  name: string;
  zootecnicalGroupId?: number;
  speciesId: number;
  breedId?: number;
  sex: 'MACHO' | 'HEMBRA';
  birthDate?: string;
  currentWeight?: number;
  colorId?: number;
  code?: string;
  microchipCode?: string | null;
  sterilized: boolean;
  generalAllergies?: string;
  generalHistory?: string;
  surgeries?: UpsertPetSurgeryRequest[];
  image?: File;
}
