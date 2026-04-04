export interface CreatePetRequest {
  clientId?: number;
  name: string;
  speciesId: number;
  breedId?: number;
  colorId?: number;
  microchipCode?: string;
  sex: 'MACHO' | 'HEMBRA';
  birthDate?: string;
  currentWeight?: number;
  sterilized?: boolean;
  generalAllergies?: string;
  generalHistory?: string;
  image?: File;
}
