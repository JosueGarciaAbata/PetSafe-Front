export interface CreateAppointmentRequest {
  patientId: number;
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
  notes?: string | null;
}
