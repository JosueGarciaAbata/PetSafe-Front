import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface ProcedureListApiResponse {
  data: ProcedureListItemApiResponse[];
  meta: PaginationMeta;
}

export interface ProcedureListItemApiResponse {
  id: number;
  procedureType: string;
  performedDate: string;
  patientName: string;
  encounterId: number;
}

export interface ProcedureDetailApiResponse {
  id: number;
  procedureType: string;
  performedDate: string;
  description: string | null;
  result: string | null;
  notes: string | null;
  catalog: { id: number; name: string } | null;
  patientId: number;
  patientName: string;
  encounterId: number;
}

export interface ProcedureListQuery {
  page: number;
  limit: number;
  search?: string;
}

interface ProceduresApiListResponse {
  data?: ProcedureListItemApiResponse[];
  meta?: PaginationMeta;
}

export function mapProceduresListResponse(
  response: ProceduresApiListResponse | null | undefined,
  fallbackLimit: number,
): ProcedureListApiResponse {
  const data = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta;

  return {
    data,
    meta: meta ?? {
      totalItems: data.length,
      itemCount: data.length,
      itemsPerPage: fallbackLimit,
      totalPages: 1,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}
