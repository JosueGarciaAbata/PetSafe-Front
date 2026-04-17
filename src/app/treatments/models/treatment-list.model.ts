import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export type TreatmentStatusApiResponse = 'ACTIVO' | 'FINALIZADO' | 'SUSPENDIDO' | 'CANCELADO';

export interface TreatmentListApiResponse {
  data: TreatmentListItemApiResponse[];
  meta: PaginationMeta;
}

export interface TreatmentListItemApiResponse {
  id: number;
  status: TreatmentStatusApiResponse;
  startDate: string;
  endDate: string | null;
  generalInstructions: string | null;
  patientName: string;
  encounterId: number;
}

export interface TreatmentDetailApiResponse {
  id: number;
  status: TreatmentStatusApiResponse;
  startDate: string;
  endDate: string | null;
  generalInstructions: string | null;
  patientId: number;
  patientName: string;
  encounterId: number;
  items: TreatmentDetailItemApiResponse[];
}

export interface TreatmentDetailItemApiResponse {
  id: number;
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes: string | null;
  status: TreatmentStatusApiResponse;
}

export interface CreateTreatmentItemRequest {
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes?: string;
  status?: TreatmentStatusApiResponse;
}

export interface UpdateTreatmentRequest {
  endDate?: string;
  generalInstructions?: string;
}

export interface TreatmentListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: TreatmentStatusApiResponse;
}

interface TreatmentsApiListResponse {
  data?: TreatmentListItemApiResponse[];
  meta?: PaginationMeta;
}

export function mapTreatmentsListResponse(
  response: TreatmentsApiListResponse | null | undefined,
  _fallbackPage: number,
  fallbackLimit: number,
): TreatmentListApiResponse {
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
