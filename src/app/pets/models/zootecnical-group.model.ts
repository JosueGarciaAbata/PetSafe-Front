import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface ZootecnicalGroupListApiResponse {
  data: ZootecnicalGroupApiResponse[];
  meta: PaginationMeta;
}

export interface ZootecnicalGroupApiResponse {
  id: number;
  name: string;
  description?: string | null;
}

export interface ZootecnicalGroupListQuery {
  page: number;
  limit: number;
  search?: string;
}
