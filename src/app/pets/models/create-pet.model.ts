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

export interface CreatePetWithoutTutorRequest {
  name: string;
  speciesId: number;
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
  image?: File;
}
