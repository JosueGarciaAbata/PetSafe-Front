export interface ClientPetSpeciesApiResponse {
  id: number;
  name: string;
}

export interface ClientPetBreedApiResponse {
  id: number;
  name: string;
}

export interface ClientPetColorApiResponse {
  id: number;
  name: string;
}

export interface ClientPetApiResponse {
  id: number;
  name: string;
  birthDate: string | null;
  species: ClientPetSpeciesApiResponse;
  breed: ClientPetBreedApiResponse;
  color: ClientPetColorApiResponse;
}
