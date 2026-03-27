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
  generalAllergies?: string;
  generalHistory?: string;
}
