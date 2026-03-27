import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface ColorListApiResponse {
  data: ColorApiResponse[];
  meta: PaginationMeta;
}

export interface ColorApiResponse {
  id: number;
  name: string;
  hexCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColorListQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateColorRequest {
  name: string;
}
