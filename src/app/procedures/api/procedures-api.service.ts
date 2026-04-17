import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  mapProceduresListResponse,
  ProcedureDetailApiResponse,
  ProcedureListApiResponse,
  ProcedureListQuery,
} from '../models/procedure-list.model';

@Injectable({
  providedIn: 'root',
})
export class ProceduresApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('procedures/basic');

  list(query: ProcedureListQuery): Observable<ProcedureListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http
      .get(this.listUrl, { params })
      .pipe(map((response) => mapProceduresListResponse(response, query.limit)));
  }

  getById(id: number | string): Observable<ProcedureDetailApiResponse> {
    return this.http.get<ProcedureDetailApiResponse>(
      buildApiUrl(`procedures/${encodeURIComponent(String(id))}`),
    );
  }
}
