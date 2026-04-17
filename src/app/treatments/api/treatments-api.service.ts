import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreateTreatmentItemRequest,
  mapTreatmentsListResponse,
  TreatmentDetailApiResponse,
  TreatmentListApiResponse,
  TreatmentListQuery,
  UpdateTreatmentRequest,
} from '../models/treatment-list.model';

@Injectable({
  providedIn: 'root',
})
export class TreatmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('treatments/basic');

  list(query: TreatmentListQuery): Observable<TreatmentListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    return this.http
      .get(this.listUrl, { params })
      .pipe(map((response) => mapTreatmentsListResponse(response, query.page, query.limit)));
  }

  getById(id: number | string): Observable<TreatmentDetailApiResponse> {
    return this.http.get<TreatmentDetailApiResponse>(
      buildApiUrl(`treatments/${encodeURIComponent(String(id))}`),
    );
  }

  addItem(
    id: number | string,
    payload: CreateTreatmentItemRequest,
  ): Observable<TreatmentDetailApiResponse> {
    return this.http.post<TreatmentDetailApiResponse>(
      buildApiUrl(`treatments/${encodeURIComponent(String(id))}/items`),
      payload,
    );
  }

  update(
    id: number | string,
    payload: UpdateTreatmentRequest,
  ): Observable<TreatmentDetailApiResponse> {
    return this.http.patch<TreatmentDetailApiResponse>(
      buildApiUrl(`treatments/${encodeURIComponent(String(id))}`),
      payload,
    );
  }
}
