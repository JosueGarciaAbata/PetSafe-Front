import { PetImageApiResponse } from '@app/pets/models/pet-image.model';
import { PaginationMeta } from '@app/shared/pagination/pagination.model';
import { AdoptionTagSummaryApiResponse } from './adoption-tag.model';

export interface AdoptionRecord {
  id: number;
  patientId: number;
  status: string;
  contactPhone: string | null;
  contactName: string | null;
  contactEmail: string | null;
  story: string | null;
  requirements: string | null;
  adopterClientId: number | null;
  adoptionDate: string | null;
  notes: string | null;
  tags?: AdoptionTagSummaryApiResponse[] | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdoptionCreateRequest {
  patientId: number;
  contactPhone: string;
  story?: string;
  requirements?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  tagIds?: number[];
}

export interface AdoptionUpdateRequest {
  status?: string;
  adopterClientId?: number;
  story?: string;
  requirements?: string;
  notes?: string;
}

export interface AdoptionBasicUpdateRequest {
  contactPhone?: string;
  story?: string;
  requirements?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  tagIds?: number[];
  image?: File;
}

export interface AdoptionBasicUpdateResponse {
  id: number;
  patientId: number;
  contactPhone: string | null;
  contactName: string | null;
  contactEmail: string | null;
  story: string | null;
  requirements: string | null;
  notes: string | null;
  tags?: AdoptionTagSummaryApiResponse[] | null;
  patient: {
    id: number;
    name: string;
    image: PetImageApiResponse | null;
  };
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
