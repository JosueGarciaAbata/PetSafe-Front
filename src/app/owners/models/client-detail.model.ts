import { ClientSummaryPersonApiResponse } from './client-summary.model';

export interface ClientResponseApiResponse {
  id: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  email?: string | null;
  person: ClientSummaryPersonApiResponse;
}
