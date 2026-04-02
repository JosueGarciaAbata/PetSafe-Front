import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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
import { AppointmentRecord } from '../models/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('appointments');
  private readonly createUrl = buildApiUrl('appointments');
  private readonly patientSearchUrl = buildApiUrl('patients/admin/search-summary');

  // ── Calendario mensual: llama al backend real ──
  listCalendarMonth(
    query: AppointmentCalendarQuery,
  ): Observable<AppointmentCalendarMonthResponse> {
    return this.fetchAppointments(query).pipe(
      map((appointments) => ({
        view: 'month' as const,
        activeDate: query.activeDate,
        appointments,
      })),
    );
  }

  // ── Calendario semanal: llama al backend real ──
  listCalendarWeek(
    query: AppointmentCalendarQuery,
  ): Observable<AppointmentCalendarWeekResponse> {
    return this.fetchAppointments(query).pipe(
      map((appointments) => ({
        view: 'week' as const,
        activeDate: query.activeDate,
        appointments,
      })),
    );
  }

  // ── Búsqueda de pacientes+tutores para el modal de nueva cita ──
  searchPatientsSummary(
    query: AppointmentPatientSearchQuery,
  ): Observable<AppointmentPatientSearchItemApiResponse[]> {
    let params = new HttpParams();
    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    if (query.limit) params = params.set('limit', query.limit);
    return this.http.get<AppointmentPatientSearchItemApiResponse[]>(this.patientSearchUrl, { params });
  }

  // ── Crear cita (POST). Devuelve la cita ya mapeada por el back ──
  create(payload: CreateAppointmentRequest): Observable<AppointmentRecord> {
    return this.http.post<AppointmentRecord>(this.createUrl, payload);
  }

  // ── Confirmar cita (PATCH) ──
  confirm(id: number): Observable<AppointmentRecord> {
    return this.http.patch<AppointmentRecord>(`${this.listUrl}/${id}/confirm`, {});
  }

  // ── Cancelar cita (PATCH) ──
  cancel(id: number): Observable<AppointmentRecord> {
    return this.http.patch<AppointmentRecord>(`${this.listUrl}/${id}/cancel`, {});
  }

  // ── Marcar cita como no asistió (PATCH) ──
  markNoShow(id: number): Observable<AppointmentRecord> {
    return this.http.patch<AppointmentRecord>(`${this.listUrl}/${id}/no-show`, {});
  }

  // ── Fetch interno: GET /appointments?from=&to= ──
  private fetchAppointments(query: AppointmentCalendarQuery): Observable<AppointmentRecord[]> {
    const params = new HttpParams()
      .set('from', query.from)
      .set('to', query.to);
    return this.http.get<AppointmentRecord[]>(this.listUrl, { params });
  }
}
