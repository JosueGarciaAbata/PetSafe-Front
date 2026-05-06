import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/config/api.config';
import { AppointmentRequestNotification } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = API_BASE_URL;

  listAppointmentRequests(): Observable<AppointmentRequestNotification[]> {
    return this.http.get<AppointmentRequestNotification[]>(`${this.base}appointment-requests`);
  }

  countPendingRequests(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}appointment-requests/pending-count`);
  }

  checkAvailability(date: string, time: string): Observable<{ available: boolean; message?: string }> {
    return this.http.get<{ available: boolean; message?: string }>(
      `${this.base}appointment-requests/check-availability`,
      { params: { date, time } },
    );
  }

  updateRequestStatus(
    id: number,
    status: 'CONFIRMADA' | 'RECHAZADA',
    staffNotes?: string,
    scheduledDate?: string,
    scheduledTime?: string,
  ): Observable<AppointmentRequestNotification> {
    return this.http.patch<AppointmentRequestNotification>(
      `${this.base}appointment-requests/${id}/status`,
      { status, staffNotes, scheduledDate, scheduledTime },
    );
  }
}
