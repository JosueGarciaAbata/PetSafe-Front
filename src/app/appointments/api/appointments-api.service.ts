import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  AppointmentCalendarMonthResponse,
  AppointmentCalendarQuery,
  AppointmentCalendarWeekResponse,
} from '../models/appointment-calendar.model';
import { CreateAppointmentRequest } from '../models/appointment-create.model';
import {
  AppointmentPatientSearchItemApiResponse,
  AppointmentPatientSearchQuery,
} from '../models/appointment-patient-search.model';
import {
  AppointmentRecord,
  AppointmentStatus,
} from '../models/appointment.model';
import {
  formatDateKey,
  parseDateKey,
} from '../utils/appointment-date.util';

interface AppointmentSeed {
  patientId: number;
  patientName: string;
  ownerName: string;
  day: number;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: AppointmentStatus;
  notes?: string | null;
  isActive?: boolean;
}

const FALLBACK_VET_ID = 1;

@Injectable({
  providedIn: 'root',
})
export class AppointmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly createUrl = buildApiUrl('appointments');
  private readonly patientSearchUrl = buildApiUrl('patients/admin/search-summary');
  private readonly appointments = this.seedAppointments();

  listCalendarMonth(
    query: AppointmentCalendarQuery,
  ): Observable<AppointmentCalendarMonthResponse> {
    const filteredAppointments = this.filterAppointmentsByRange(query);

    return of({
      view: 'month' as const,
      activeDate: query.activeDate,
      appointments: filteredAppointments.map((appointment) => ({ ...appointment })),
    }).pipe(delay(180));
  }

  listCalendarWeek(
    query: AppointmentCalendarQuery,
  ): Observable<AppointmentCalendarWeekResponse> {
    const filteredAppointments = this.filterAppointmentsByRange(query);

    return of({
      view: 'week' as const,
      activeDate: query.activeDate,
      appointments: filteredAppointments.map((appointment) => ({ ...appointment })),
    }).pipe(delay(180));
  }

  searchPatientsSummary(
    query: AppointmentPatientSearchQuery,
  ): Observable<AppointmentPatientSearchItemApiResponse[]> {
    let params = new HttpParams();

    const search = query.search?.trim();
    if (search) {
      params = params.set('search', search);
    }

    if (query.limit) {
      params = params.set('limit', query.limit);
    }

    return this.http.get<AppointmentPatientSearchItemApiResponse[]>(this.patientSearchUrl, { params });
  }

  create(payload: CreateAppointmentRequest): Observable<unknown> {
    return this.http.post<unknown>(this.createUrl, payload);
  }

  registerLocalCreatedAppointment(
    payload: CreateAppointmentRequest,
    patient: Pick<AppointmentPatientSearchItemApiResponse, 'patientId' | 'patientName' | 'tutorName'>,
  ): void {
    this.appointments.unshift({
      id: this.getNextAppointmentId(),
      patientId: patient.patientId,
      vetId: this.resolveCurrentVetId(),
      patientName: patient.patientName.trim(),
      ownerName: patient.tutorName.trim(),
      scheduledDate: payload.scheduledDate,
      startsAt: payload.scheduledTime,
      endsAt: null,
      reason: payload.reason.trim(),
      notes: payload.notes?.trim() || null,
      status: 'PROGRAMADA',
      isActive: true,
    });
  }

  private filterAppointmentsByRange(
    query: AppointmentCalendarQuery,
  ): AppointmentRecord[] {
    const vetId = query.vetId ?? this.resolveCurrentVetId();
    const rangeStart = parseDateKey(query.from);
    const rangeEnd = parseDateKey(query.to);

    return this.appointments.filter((appointment) => {
      if (!appointment.isActive || appointment.vetId !== vetId) {
        return false;
      }

      const appointmentDate = parseDateKey(appointment.scheduledDate);
      return appointmentDate >= rangeStart && appointmentDate <= rangeEnd;
    });
  }

  private seedAppointments(): AppointmentRecord[] {
    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const vetId = this.resolveCurrentVetId();

    const seeds: readonly AppointmentSeed[] = [
      {
        patientId: 101,
        patientName: 'Luna',
        ownerName: 'Maria Garcia',
        day: 2,
        startsAt: '09:00',
        endsAt: '09:30',
        reason: 'Consulta general',
        status: 'PROGRAMADA',
      },
      {
        patientId: 102,
        patientName: 'Max',
        ownerName: 'Juan Perez',
        day: 4,
        startsAt: '11:00',
        endsAt: '11:30',
        reason: 'Vacunacion',
        status: 'CONFIRMADA',
      },
      {
        patientId: 103,
        patientName: 'Rocky',
        ownerName: 'Carla Ruiz',
        day: 7,
        startsAt: '10:30',
        endsAt: '11:30',
        reason: 'Cirugia',
        status: 'CONFIRMADA',
        notes: 'Preparar ayuno previo.',
      },
      {
        patientId: 104,
        patientName: 'Moka',
        ownerName: 'Luis Fernandez',
        day: 9,
        startsAt: '16:00',
        endsAt: '16:30',
        reason: 'Control',
        status: 'FINALIZADA',
      },
      {
        patientId: 105,
        patientName: 'Kiwi',
        ownerName: 'Elena Vega',
        day: 12,
        startsAt: '08:30',
        endsAt: '09:00',
        reason: 'Procedimiento',
        status: 'PROGRAMADA',
      },
      {
        patientId: 106,
        patientName: 'Nube',
        ownerName: 'Roberto Diaz',
        day: 14,
        startsAt: '15:00',
        endsAt: '15:30',
        reason: 'Tratamiento',
        status: 'EN_PROCESO',
      },
      {
        patientId: 107,
        patientName: 'Tita',
        ownerName: 'Laura Paredes',
        day: 14,
        startsAt: '17:00',
        endsAt: '17:30',
        reason: 'Consulta general',
        status: 'CONFIRMADA',
      },
      {
        patientId: 108,
        patientName: 'Tambor',
        ownerName: 'Sofia Mora',
        day: 18,
        startsAt: '10:00',
        endsAt: '10:30',
        reason: 'Control',
        status: 'PROGRAMADA',
      },
      {
        patientId: 109,
        patientName: 'Pico',
        ownerName: 'Andrea Torres',
        day: 21,
        startsAt: '12:30',
        endsAt: '13:00',
        reason: 'Emergencia',
        status: 'CONFIRMADA',
        notes: 'Atencion prioritaria.',
      },
      {
        patientId: 110,
        patientName: 'Miel',
        ownerName: 'Javier Leon',
        day: 25,
        startsAt: '09:30',
        endsAt: '10:00',
        reason: 'Vacunacion',
        status: 'CANCELADA',
      },
      {
        patientId: 111,
        patientName: 'Sasha',
        ownerName: 'Diana Ponce',
        day: Math.min(Math.max(today.getDate(), 1), lastDay),
        startsAt: '14:00',
        endsAt: '14:30',
        reason: 'Consulta general',
        status: 'PROGRAMADA',
      },
      {
        patientId: 112,
        patientName: 'Bruno',
        ownerName: 'Pedro Mena',
        day: Math.min(Math.max(today.getDate() + 1, 1), lastDay),
        startsAt: '18:00',
        endsAt: '18:30',
        reason: 'Tratamiento',
        status: 'CONFIRMADA',
      },
    ];

    return seeds.map((seed, index) => {
      const safeDay = Math.min(seed.day, lastDay);
      const date = new Date(year, monthIndex, safeDay);
      const dateKey = formatDateKey(date);

      return {
        id: index + 1,
        patientId: seed.patientId,
        vetId,
        patientName: seed.patientName,
        ownerName: seed.ownerName,
        scheduledDate: dateKey,
        startsAt: seed.startsAt,
        endsAt: seed.endsAt,
        reason: seed.reason,
        notes: seed.notes ?? null,
        status: seed.status,
        isActive: seed.isActive ?? true,
      };
    });
  }

  private resolveCurrentVetId(): number {
    const currentUser = this.authService.getUser();

    if (!currentUser) {
      return FALLBACK_VET_ID;
    }

    const vetId = Number(currentUser.id);

    return Number.isInteger(vetId) && vetId > 0 ? vetId : FALLBACK_VET_ID;
  }

  private getNextAppointmentId(): number {
    return this.appointments.reduce((maxId, appointment) => Math.max(maxId, appointment.id), 0) + 1;
  }
}
