import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  QUEUE_VETERINARIANS,
  QueueEntryCreateRequest,
  QueueEntryRecord,
  QueueEntryStatus,
  QueueEntryType,
  QueueListQuery,
  QueueListResponse,
  QueuePatientSummary,
  QueueSummary,
  QueueVeterinarianSummary,
  buildQueueEntryTypeLabel,
  buildQueueStatusLabel,
  createPaginationMeta,
} from '../models/queue.model';

interface QueueEntrySeed {
  patient: QueuePatientSummary;
  veterinarianId: number;
  entryType: QueueEntryType;
  arrivalTime: string;
  scheduledTime: string | null;
  queueStatus: QueueEntryStatus;
  notes: string | null;
  waitMinutes: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class QueueApiService {
  private readonly entries = new Map<number, QueueEntryRecord>();
  private nextEntryId = 1001;
  private nextPatientId = 7001;

  constructor() {
    this.seedEntries().forEach((entry) => {
      this.entries.set(entry.id, entry);
    });
  }

  list(query: QueueListQuery): Observable<QueueListResponse> {
    const sortedEntries = this.sortEntries(this.getSnapshot());
    const summary = this.buildSummary(sortedEntries);
    const filteredEntries = this.applyFilters(sortedEntries, query);
    const meta = createPaginationMeta(filteredEntries.length, query.page, query.limit);
    const startIndex = (meta.currentPage - 1) * meta.itemsPerPage;
    const pageEntries = filteredEntries.slice(startIndex, startIndex + meta.itemsPerPage);

    return of({
      data: pageEntries.map((entry) => this.cloneEntry(entry)),
      meta,
      summary,
    }).pipe(delay(180));
  }

  createEntry(payload: QueueEntryCreateRequest): Observable<QueueEntryRecord> {
    const veterinarian = this.getVeterinarianById(payload.veterinarianId);
    const now = new Date();
    const arrivalTime = this.formatTime(now);
    const scheduledTime = payload.scheduledTime?.trim() || null;
    const notes = payload.notes?.trim() || null;

    const entry: QueueEntryRecord = {
      id: this.nextEntryId++,
      date: this.formatDate(now),
      appointmentId: null,
      patient: {
        id: this.nextPatientId++,
        name: payload.patientName.trim(),
        species: payload.patientSpecies.trim(),
        breed: payload.patientBreed.trim(),
        tutorName: payload.tutorName.trim(),
        tutorPhone: payload.tutorPhone.trim(),
      },
      veterinarian,
      entryType: payload.entryType,
      arrivalTime,
      scheduledTime,
      queueStatus: 'EN_ESPERA',
      notes,
      waitMinutes: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.entries.set(entry.id, entry);
    return of(this.cloneEntry(entry)).pipe(delay(180));
  }

  startAttention(entryId: number): Observable<QueueEntryRecord> {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return throwError(() => new Error('No se encontro la entrada en la cola.'));
    }

    if (entry.queueStatus !== 'EN_ESPERA') {
      return throwError(() => new Error('Solo se puede iniciar una atencion que este en espera.'));
    }

    const updatedEntry: QueueEntryRecord = {
      ...entry,
      queueStatus: 'EN_ATENCION',
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(entryId, updatedEntry);
    return of(this.cloneEntry(updatedEntry)).pipe(delay(180));
  }

  finishAttention(entryId: number): Observable<QueueEntryRecord> {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return throwError(() => new Error('No se encontro la entrada en la cola.'));
    }

    if (entry.queueStatus !== 'EN_ATENCION') {
      return throwError(() => new Error('Solo se puede finalizar una atencion que ya inicio.'));
    }

    const updatedEntry: QueueEntryRecord = {
      ...entry,
      queueStatus: 'FINALIZADA',
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(entryId, updatedEntry);
    return of(this.cloneEntry(updatedEntry)).pipe(delay(180));
  }

  cancelEntry(entryId: number): Observable<QueueEntryRecord> {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return throwError(() => new Error('No se encontro la entrada en la cola.'));
    }

    if (entry.queueStatus !== 'EN_ESPERA') {
      return throwError(() => new Error('Solo se puede cancelar un ingreso que este en espera.'));
    }

    const updatedEntry: QueueEntryRecord = {
      ...entry,
      queueStatus: 'CANCELADA',
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(entryId, updatedEntry);
    return of(this.cloneEntry(updatedEntry)).pipe(delay(180));
  }

  private seedEntries(): QueueEntryRecord[] {
    const today = this.formatDate(new Date());

    return [
      this.buildEntry(today, {
        patient: {
          id: 7001,
          name: 'Luna',
          species: 'Perro',
          breed: 'Golden Retriever',
          tutorName: 'Maria Garcia',
          tutorPhone: '099 123 4567',
        },
        veterinarianId: 1,
        entryType: 'CON_CITA',
        arrivalTime: '08:55',
        scheduledTime: '09:00',
        queueStatus: 'EN_ESPERA',
        notes: 'Revision de control anual.',
        waitMinutes: 15,
        createdAt: `${today}T08:55:00.000Z`,
        updatedAt: `${today}T08:55:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7002,
          name: 'Max',
          species: 'Gato',
          breed: 'Siames',
          tutorName: 'Juan Perez',
          tutorPhone: '098 222 1144',
        },
        veterinarianId: 2,
        entryType: 'CON_CITA',
        arrivalTime: '09:10',
        scheduledTime: '09:15',
        queueStatus: 'EN_ESPERA',
        notes: 'Primera dosis de refuerzo.',
        waitMinutes: 5,
        createdAt: `${today}T09:10:00.000Z`,
        updatedAt: `${today}T09:10:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7003,
          name: 'Rocky',
          species: 'Perro',
          breed: 'Bulldog',
          tutorName: 'Ana Lopez',
          tutorPhone: '097 888 3322',
        },
        veterinarianId: 1,
        entryType: 'CON_CITA',
        arrivalTime: '09:00',
        scheduledTime: '09:00',
        queueStatus: 'EN_ATENCION',
        notes: 'Paciente en sala de preparacion.',
        waitMinutes: 0,
        createdAt: `${today}T09:00:00.000Z`,
        updatedAt: `${today}T09:24:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7004,
          name: 'Tambor',
          species: 'Conejo',
          breed: 'Mini Lop',
          tutorName: 'Roberto Diaz',
          tutorPhone: '096 551 7788',
        },
        veterinarianId: 3,
        entryType: 'EMERGENCIA',
        arrivalTime: '10:05',
        scheduledTime: null,
        queueStatus: 'EN_ESPERA',
        notes: 'Ingreso por cuadro respiratorio.',
        waitMinutes: 0,
        createdAt: `${today}T10:05:00.000Z`,
        updatedAt: `${today}T10:05:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7005,
          name: 'Nube',
          species: 'Gato',
          breed: 'Mestizo',
          tutorName: 'Carla Ruiz',
          tutorPhone: '095 400 0090',
        },
        veterinarianId: 2,
        entryType: 'SIN_CITA',
        arrivalTime: '10:20',
        scheduledTime: null,
        queueStatus: 'EN_ESPERA',
        notes: 'Llegada directa desde recepcion.',
        waitMinutes: 12,
        createdAt: `${today}T10:20:00.000Z`,
        updatedAt: `${today}T10:20:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7006,
          name: 'Moka',
          species: 'Perro',
          breed: 'Poodle',
          tutorName: 'Luis Fernandez',
          tutorPhone: '099 745 2201',
        },
        veterinarianId: 1,
        entryType: 'CON_CITA',
        arrivalTime: '10:12',
        scheduledTime: '10:30',
        queueStatus: 'EN_ESPERA',
        notes: 'Seguimiento de evolucion.',
        waitMinutes: 18,
        createdAt: `${today}T10:12:00.000Z`,
        updatedAt: `${today}T10:12:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7007,
          name: 'Kiwi',
          species: 'Perro',
          breed: 'Corgi',
          tutorName: 'Elena Vega',
          tutorPhone: '094 112 4455',
        },
        veterinarianId: 3,
        entryType: 'EMERGENCIA',
        arrivalTime: '10:38',
        scheduledTime: null,
        queueStatus: 'EN_ESPERA',
        notes: 'Dolor abdominal subito.',
        waitMinutes: 3,
        createdAt: `${today}T10:38:00.000Z`,
        updatedAt: `${today}T10:38:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7008,
          name: 'Tita',
          species: 'Perro',
          breed: 'Shih Tzu',
          tutorName: 'Diego Morales',
          tutorPhone: '093 007 4488',
        },
        veterinarianId: 2,
        entryType: 'CON_CITA',
        arrivalTime: '08:40',
        scheduledTime: '08:45',
        queueStatus: 'FINALIZADA',
        notes: 'Atencion terminada y seguimiento indicado.',
        waitMinutes: 0,
        createdAt: `${today}T08:40:00.000Z`,
        updatedAt: `${today}T09:20:00.000Z`,
      }),
      this.buildEntry(today, {
        patient: {
          id: 7009,
          name: 'Pico',
          species: 'Gato',
          breed: 'Criollo',
          tutorName: 'Laura Paredes',
          tutorPhone: '092 444 6611',
        },
        veterinarianId: 1,
        entryType: 'SIN_CITA',
        arrivalTime: '11:05',
        scheduledTime: null,
        queueStatus: 'CANCELADA',
        notes: 'El tutor no asistio a la cita.',
        waitMinutes: 0,
        createdAt: `${today}T11:05:00.000Z`,
        updatedAt: `${today}T11:20:00.000Z`,
      }),
    ];
  }

  private buildEntry(date: string, seed: QueueEntrySeed): QueueEntryRecord {
    const entryId = this.nextEntryId++;

    return {
      id: entryId,
      date,
      appointmentId: seed.entryType === 'CON_CITA' ? entryId + 100 : null,
      patient: this.clonePatient(seed.patient),
      veterinarian: this.getVeterinarianById(seed.veterinarianId),
      entryType: seed.entryType,
      arrivalTime: seed.arrivalTime,
      scheduledTime: seed.scheduledTime,
      queueStatus: seed.queueStatus,
      notes: seed.notes,
      waitMinutes: seed.waitMinutes,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
    };
  }

  private getSnapshot(): QueueEntryRecord[] {
    return Array.from(this.entries.values()).map((entry) => this.cloneEntry(entry));
  }

  private applyFilters(entries: QueueEntryRecord[], query: QueueListQuery): QueueEntryRecord[] {
    const searchTerm = query.searchTerm?.trim().toLowerCase() ?? '';

    return entries.filter((entry) => {
      if (query.status && query.status !== 'TODOS' && entry.queueStatus !== query.status) {
        return false;
      }

      if (
        query.veterinarianId !== undefined &&
        query.veterinarianId !== 'TODOS' &&
        entry.veterinarian.id !== query.veterinarianId
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        entry.patient.name,
        entry.patient.species,
        entry.patient.breed,
        entry.patient.tutorName,
        entry.patient.tutorPhone,
        entry.notes ?? '',
        buildQueueEntryTypeLabel(entry.entryType),
        buildQueueStatusLabel(entry.queueStatus),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }

  private buildSummary(entries: QueueEntryRecord[]): QueueSummary {
    const waitingEntries = entries.filter((entry) => entry.queueStatus === 'EN_ESPERA');
    const inAttentionEntries = entries.filter((entry) => entry.queueStatus === 'EN_ATENCION');
    const finishedEntries = entries.filter((entry) => entry.queueStatus === 'FINALIZADA');
    const emergencyEntries = entries.filter((entry) => entry.entryType === 'EMERGENCIA');
    const activeEntries = entries.filter(
      (entry) => entry.queueStatus === 'EN_ESPERA' || entry.queueStatus === 'EN_ATENCION',
    );
    const averageWaitMinutes =
      activeEntries.length === 0
        ? 0
        : Math.round(
            activeEntries.reduce((sum, entry) => sum + entry.waitMinutes, 0) / activeEntries.length,
          );

    return {
      totalEntries: entries.length,
      waitingEntries: waitingEntries.length,
      inAttentionEntries: inAttentionEntries.length,
      finishedEntries: finishedEntries.length,
      emergencyEntries: emergencyEntries.length,
      averageWaitMinutes,
      currentAttentionEntry: inAttentionEntries[0] ? this.cloneEntry(inAttentionEntries[0]) : null,
      nextUpEntry: waitingEntries[0] ? this.cloneEntry(waitingEntries[0]) : null,
    };
  }

  private sortEntries(entries: QueueEntryRecord[]): QueueEntryRecord[] {
    return [...entries].sort((left, right) => this.compareEntries(left, right));
  }

  private compareEntries(left: QueueEntryRecord, right: QueueEntryRecord): number {
    const statusRank: Record<QueueEntryStatus, number> = {
      EN_ATENCION: 0,
      EN_ESPERA: 1,
      FINALIZADA: 2,
      CANCELADA: 3,
    };

    const typeRank: Record<QueueEntryType, number> = {
      EMERGENCIA: 0,
      CON_CITA: 1,
      SIN_CITA: 2,
    };

    const statusDiff = statusRank[left.queueStatus] - statusRank[right.queueStatus];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    if (left.queueStatus === 'EN_ESPERA' && right.queueStatus === 'EN_ESPERA') {
      const typeDiff = typeRank[left.entryType] - typeRank[right.entryType];
      if (typeDiff !== 0) {
        return typeDiff;
      }

      if (left.scheduledTime && right.scheduledTime && left.scheduledTime !== right.scheduledTime) {
        return left.scheduledTime.localeCompare(right.scheduledTime);
      }

      if (left.scheduledTime && !right.scheduledTime) {
        return -1;
      }

      if (!left.scheduledTime && right.scheduledTime) {
        return 1;
      }

      if (left.arrivalTime !== right.arrivalTime) {
        return left.arrivalTime.localeCompare(right.arrivalTime);
      }

      return left.id - right.id;
    }

    if (
      (left.queueStatus === 'FINALIZADA' || left.queueStatus === 'CANCELADA') &&
      (right.queueStatus === 'FINALIZADA' || right.queueStatus === 'CANCELADA')
    ) {
      const dateDiff = right.updatedAt.localeCompare(left.updatedAt);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return left.id - right.id;
    }

    return left.id - right.id;
  }

  private cloneEntry(entry: QueueEntryRecord): QueueEntryRecord {
    return {
      ...entry,
      patient: this.clonePatient(entry.patient),
      veterinarian: { ...entry.veterinarian },
    };
  }

  private clonePatient(patient: QueuePatientSummary): QueuePatientSummary {
    return {
      ...patient,
    };
  }

  private getVeterinarianById(veterinarianId: number): QueueVeterinarianSummary {
    return (
      QUEUE_VETERINARIANS.find((veterinarian) => veterinarian.id === veterinarianId) ??
      QUEUE_VETERINARIANS[0]
    );
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
