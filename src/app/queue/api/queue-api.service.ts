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
      params = params.set('search', query.searchTerm.trim());
    }
    if (query.status && query.status !== 'TODOS') {
      params = params.set('status', query.status);
    }

    return this.http.get<QueueListResponse>(this.baseUrl, { params });
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
