import { PetImageApiResponse } from '@app/pets/models/pet-image.model';
import { PaginationMeta } from '@app/shared/pagination/pagination.model';
import { EncounterStatus } from '@app/encounters/models/encounter.model';

export type QueueEntryType = 'CON_CITA' | 'SIN_CITA' | 'EMERGENCIA';
export type QueueEntryStatus = 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADA' | 'CANCELADA';
export type QueueStatusFilter = QueueEntryStatus | 'TODOS';
export type QueueVeterinarianFilter = number | 'TODOS';

export interface QueueVeterinarianSummary {
  id: number;
  name: string;
  code: string;
}

export interface QueuePatientSummary {
  id: number;
  name: string;
  species: string;
  breed: string;
  tutorName: string;
  tutorPhone: string;
  image: PetImageApiResponse | null;
}

export interface QueueEncounterSummary {
  id: number;
  status: EncounterStatus;
  canReactivate: boolean;
  reactivationGraceEndsAt: string | null;
}

export interface QueueEntryRecord {
  id: number;
  date: string;
  appointmentId: number | null;
  patient: QueuePatientSummary;
  veterinarian: QueueVeterinarianSummary;
  entryType: QueueEntryType;
  arrivalTime: string;
  scheduledTime: string | null;
  queueStatus: QueueEntryStatus;
  notes: string | null;
  encounter: QueueEncounterSummary | null;
  waitMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueSummary {
  totalEntries: number;
  waitingEntries: number;
  inAttentionEntries: number;
  finishedEntries: number;
  emergencyEntries: number;
  averageWaitMinutes: number;
  currentAttentionEntry: QueueEntryRecord | null;
  nextUpEntry: QueueEntryRecord | null;
}

export interface QueueListQuery {
  page: number;
  limit: number;
  searchTerm?: string;
  status?: QueueStatusFilter;
  veterinarianId?: QueueVeterinarianFilter;
}

export interface QueueListResponse {
  data: QueueEntryRecord[];
  meta: PaginationMeta;
  summary: QueueSummary;
}

export interface QueueEntryCreateRequest {
  patientId: number;
  veterinarianId?: number | null;
  entryType: QueueEntryType;
  appointmentId?: number | null;
  scheduledTime?: string | null;
  notes?: string | null;
}

export const QUEUE_VETERINARIANS: ReadonlyArray<QueueVeterinarianSummary> = [
  { id: 1, name: 'Dra. Valeria Andrade', code: 'MVZ-01' },
  { id: 2, name: 'Dr. Andrés Paredes', code: 'MVZ-02' },
  { id: 3, name: 'Dra. Sofía Cedeño', code: 'MVZ-03' },
];

export const QUEUE_STATUS_FILTERS: ReadonlyArray<{
  value: QueueStatusFilter;
  label: string;
}> = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'EN_ESPERA', label: 'En espera' },
  { value: 'EN_ATENCION', label: 'En atención' },
  { value: 'FINALIZADA', label: 'Finalizados' },
  { value: 'CANCELADA', label: 'Cancelados' },
];

export const QUEUE_ENTRY_TYPE_OPTIONS: ReadonlyArray<{
  value: QueueEntryType;
  label: string;
}> = [
  { value: 'CON_CITA', label: 'Con cita' },
  { value: 'SIN_CITA', label: 'Sin cita' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
];

export const EMPTY_QUEUE_SUMMARY: QueueSummary = {
  totalEntries: 0,
  waitingEntries: 0,
  inAttentionEntries: 0,
  finishedEntries: 0,
  emergencyEntries: 0,
  averageWaitMinutes: 0,
  currentAttentionEntry: null,
  nextUpEntry: null,
};

export function createPaginationMeta(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
): PaginationMeta {
  const safeItemsPerPage = Math.max(itemsPerPage, 1);
  const totalPages = Math.max(Math.ceil(totalItems / safeItemsPerPage), 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const itemCount =
    totalItems === 0
      ? 0
      : Math.min(safeItemsPerPage, totalItems - (safeCurrentPage - 1) * safeItemsPerPage);

  return {
    totalItems,
    itemCount,
    itemsPerPage: safeItemsPerPage,
    totalPages,
    currentPage: safeCurrentPage,
    hasNextPage: safeCurrentPage < totalPages,
    hasPrevPage: safeCurrentPage > 1,
  };
}

export function buildQueueEntryTypeLabel(entryType: QueueEntryType): string {
  switch (entryType) {
    case 'CON_CITA':
      return 'Con cita';
    case 'SIN_CITA':
      return 'Sin cita';
    case 'EMERGENCIA':
      return 'Emergencia';
  }
}

export function buildQueueStatusLabel(status: QueueEntryStatus): string {
  switch (status) {
    case 'EN_ESPERA':
      return 'En espera';
    case 'EN_ATENCION':
      return 'En atención';
    case 'FINALIZADA':
      return 'Finalizado';
    case 'CANCELADA':
      return 'Cancelado';
  }
}

export function buildQueueWaitLabel(waitMinutes: number): string {
  if (waitMinutes <= 0) {
    return 'Ahora';
  }

  if (waitMinutes < 60) {
    return `${waitMinutes} min`;
  }

  const hours = Math.floor(waitMinutes / 60);
  const minutes = waitMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

export function buildQueueTimingLabel(
  entry: Pick<QueueEntryRecord, 'queueStatus' | 'waitMinutes'>,
): string {
  switch (entry.queueStatus) {
    case 'EN_ESPERA':
      return buildQueueWaitLabel(entry.waitMinutes);
    case 'EN_ATENCION':
      return 'En consulta';
    case 'FINALIZADA':
      return 'Atendido';
    case 'CANCELADA':
      return 'Cancelado';
  }
}

export function formatQueueTime(value: string | null | undefined): string {
  if (!value) {
    return 'Sin hora';
  }

  const normalizedValue = value.trim();
  const timeMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})/);

  if (!timeMatch) {
    return normalizedValue;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return normalizedValue;
  }

  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')} ${meridiem}`;
}

export function buildQueuePatientSubtitle(entry: Pick<QueueEntryRecord, 'patient'>): string {
  return `${entry.patient.species} · ${entry.patient.breed}`;
}
