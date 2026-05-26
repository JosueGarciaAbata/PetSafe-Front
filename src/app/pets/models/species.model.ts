import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface SpeciesListApiResponse {
  data: SpeciesApiResponse[];
  meta: PaginationMeta;
}

export interface SpeciesApiResponse {
  id: number;
  zootecnicalGroupId: number;
  zootecnicalGroup?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;
  name: string;
  breeds: SpeciesBreedApiResponse[];
}

export interface SpeciesBreedApiResponse {
  id: number;
  name: string;
}

export interface SpeciesListQuery {
  page: number;
  limit: number;
  search?: string;
}
