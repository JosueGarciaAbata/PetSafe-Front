export type AppointmentStatus =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_PROCESO'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface AppointmentRecord {
  id: number;
  patientId: number;
  vetId: number;
  patientName: string | null;
  ownerName: string | null;
  scheduledDate: string;
  startsAt: string;
  endsAt: string | null;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  isActive: boolean;
}

export function buildAppointmentReasonLabel(reason: string | null): string {
  const normalizedReason = reason?.trim() ?? '';

  if (!normalizedReason) {
    return 'Sin motivo';
  }

  return normalizedReason;
}

export function buildAppointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'PROGRAMADA':
      return 'Programada';
    case 'CONFIRMADA':
      return 'Confirmada';
    case 'EN_PROCESO':
      return 'En proceso';
    case 'FINALIZADA':
      return 'Finalizada';
    case 'CANCELADA':
      return 'Cancelada';
  }
}
