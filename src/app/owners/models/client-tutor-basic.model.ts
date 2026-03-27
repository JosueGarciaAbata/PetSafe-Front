import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface ClientTutorBasicListApiResponse {
  data: ClientTutorBasicApiResponse[];
  meta: PaginationMeta;
}

export interface ClientTutorBasicApiResponse {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface ClientTutorBasicQuery {
  page: number;
  limit: number;
  search?: string;
}
