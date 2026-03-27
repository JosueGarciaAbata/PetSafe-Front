export interface CreatePetRequest {
  clientId: number;
  name: string;
  speciesId: number;
  colorId: number;
  microchipCode: string;
  sex: 'MACHO' | 'HEMBRA';
  birthDate?: string;
  currentWeight: number;
  generalAllergies?: string;
  generalHistory?: string;
}
