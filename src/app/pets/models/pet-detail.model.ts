export interface PetBasicDetailApiResponse {
  id: number;
  name: string;
  species: PetDetailCatalogApiResponse | null;
  breed: PetDetailCatalogApiResponse | null;
  sex: string | null;
  currentWeight: number | null;
  birthDate: string | null;
  ageYears: number | null;
  color: PetDetailCatalogApiResponse | null;
  sterilized: boolean | null;
  clinicalObservations: PetClinicalObservationApiResponse[];
  recentActivity: unknown | null;
}

export interface PetDetailCatalogApiResponse {
  id: number;
  name: string;
}

export interface PetClinicalObservationApiResponse {
  id: number;
  type: string;
  name: string;
  description: string | null;
  active: boolean;
}
