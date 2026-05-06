export type AppointmentRequestStatus = 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA' | 'CANCELADA';

export interface AppointmentRequestNotification {
  id: number;
  clientUserId: number;
  patientId: number | null;
  reason: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: AppointmentRequestStatus;
  staffNotes: string | null;
  createdAt: string;
  updatedAt: string;
  clientUser?: {
    email: string;
    person?: { firstName: string; lastName: string };
  };
  patient?: { name: string; id: number } | null;
}

export const STATUS_LABELS: Record<AppointmentRequestStatus, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export const STATUS_COLORS: Record<AppointmentRequestStatus, string> = {
  PENDIENTE: 'warning',
  CONFIRMADA: 'success',
  RECHAZADA: 'danger',
  CANCELADA: 'muted',
};
