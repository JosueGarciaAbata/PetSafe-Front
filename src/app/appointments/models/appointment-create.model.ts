import { AppointmentReason } from './appointment.model';

export interface CreateAppointmentRequest {
  patientId: number;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  reason: AppointmentReason;
  notes?: string | null;
}
