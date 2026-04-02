export interface AdoptionRecord {
  id: number;
  patientId: number;
  status: string; // Dinámico desde MetadataStore
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
