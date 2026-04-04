import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface AdoptionRecord {
  id: number;
  patientId: number;
  status: string;
  story: string | null;
  requirements: string | null;
  adopterClientId: number | null;
  adoptionDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdoptionCreateRequest {
  patientId: number;
  story?: string;
  requirements?: string;
  notes?: string;
}

export interface AdoptionUpdateRequest {
  status?: string;
  adopterClientId?: number;
  story?: string;
  requirements?: string;
  notes?: string;
}

export interface AdoptionBasicItemApiResponse {
  id: number;
  patientId: number;
  patientName: string;
  speciesName: string | null;
  breedName: string | null;
  currentWeight: number | null;
  birthDate: string | null;
  ageYears: number | null;
  adopterClientId: number | null;
  status: string;
  notes: string | null;
}

export interface AdoptionBasicListApiResponse {
  data: AdoptionBasicItemApiResponse[];
  meta: PaginationMeta;
}

export interface AdoptionBasicListQuery {
  page: number;
  limit: number;
  search?: string;
}
