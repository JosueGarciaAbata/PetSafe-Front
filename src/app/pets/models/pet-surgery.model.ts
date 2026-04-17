export type PetSurgeryStatus =
  | 'PROGRAMADA'
  | 'EN_CURSO'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface PetSurgeryApiResponse {
  id: number;
  encounterId: number | null;
  catalogId: number | null;
  surgeryType: string;
  scheduledDate: string | null;
  performedDate: string | null;
  surgeryStatus: PetSurgeryStatus;
  isExternal: boolean;
  description: string | null;
  postoperativeInstructions: string | null;
}

export interface UpsertPetSurgeryRequest {
  id?: number;
  catalogId?: number;
  surgeryType?: string;
  scheduledDate?: string;
  performedDate?: string;
  surgeryStatus?: PetSurgeryStatus;
  description?: string;
  postoperativeInstructions?: string;
}
