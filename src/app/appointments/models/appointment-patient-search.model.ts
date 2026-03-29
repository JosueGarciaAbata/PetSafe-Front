export interface AppointmentPatientSearchItemApiResponse {
  patientId: number;
  patientName: string;
  tutorId: number;
  tutorName: string;
  documentId: string | null;
}

export interface AppointmentPatientSearchQuery {
  search?: string;
  limit?: number;
}
