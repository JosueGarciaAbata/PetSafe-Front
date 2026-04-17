import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  QueueEntryCreateRequest,
  QueueEntryRecord,
  QueueListQuery,
  QueueListResponse,
} from '../models/queue.model';

@Injectable({
  providedIn: 'root',
})
export class QueueApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('queue');

  /** GET /queue?page=&limit=&search=&status= */
  list(query: QueueListQuery): Observable<QueueListResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    if (query.searchTerm?.trim()) {
      params = params.set('searchTerm', query.searchTerm.trim());
    }
    if (query.status && query.status !== 'TODOS') {
      params = params.set('status', query.status);
    }

    return this.http.get<QueueListResponse>(this.baseUrl, { params });
  }

  /** GET /queue/:id */
  getEntry(entryId: number): Observable<QueueEntryRecord> {
    return this.http.get<QueueEntryRecord>(`${this.baseUrl}/${entryId}`);
  }

  /** GET /queue/by-encounter/:encounterId */
  getEntryByEncounter(encounterId: number): Observable<QueueEntryRecord> {
    return this.http.get<QueueEntryRecord>(`${this.baseUrl}/by-encounter/${encounterId}`);
  }

  /** POST /queue — registra llegada de paciente */
  createEntry(payload: QueueEntryCreateRequest): Observable<QueueEntryRecord> {
    return this.http.post<QueueEntryRecord>(this.baseUrl, payload);
  }

  /** PATCH /queue/:id/start → EN_ATENCION */
  startAttention(entryId: number): Observable<QueueEntryRecord> {
    return this.http.patch<QueueEntryRecord>(`${this.baseUrl}/${entryId}/start`, {});
  }

  /** PATCH /queue/:id/finish → FINALIZADA */
  finishAttention(entryId: number): Observable<QueueEntryRecord> {
    return this.http.patch<QueueEntryRecord>(`${this.baseUrl}/${entryId}/finish`, {});
  }

  /** PATCH /queue/:id/cancel → CANCELADA */
  cancelEntry(entryId: number): Observable<QueueEntryRecord> {
    return this.http.patch<QueueEntryRecord>(`${this.baseUrl}/${entryId}/cancel`, {});
  }
}
