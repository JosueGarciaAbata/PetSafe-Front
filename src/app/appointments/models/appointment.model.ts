export type AppointmentStatus =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_PROCESO'
  | 'FINALIZADA'
  | 'CANCELADA';

export const APPOINTMENT_REASON_VALUES = [
  'CONSULTA_GENERAL',
  'VACUNACION',
  'TRATAMIENTO',
  'CIRUGIA',
  'PROCEDIMIENTO',
  'CONTROL',
  'EMERGENCIA',
] as const;

export type AppointmentReason = (typeof APPOINTMENT_REASON_VALUES)[number];

export interface AppointmentRecord {
  id: number;
  patientId: number;
  vetId: number;
  patientName: string | null;
  ownerName: string | null;
  scheduledDate: string;
  startsAt: string;
  endsAt: string | null;
  reason: AppointmentReason | null;
  notes: string | null;
  status: AppointmentStatus;
  isActive: boolean;
}

export function buildAppointmentReasonLabel(reason: AppointmentReason | string | null): string {
  const normalizedReason = reason?.trim() ?? '';

  if (!normalizedReason) {
    return 'Sin motivo';
  }

  switch (normalizedReason) {
    case 'CONSULTA_GENERAL':
      return 'Consulta general';
    case 'VACUNACION':
      return 'Vacunacion';
    case 'TRATAMIENTO':
      return 'Tratamiento';
    case 'CIRUGIA':
      return 'Cirugia';
    case 'PROCEDIMIENTO':
      return 'Procedimiento';
    case 'CONTROL':
      return 'Control';
    case 'EMERGENCIA':
      return 'Emergencia';
    default:
      return normalizedReason;
  }
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
