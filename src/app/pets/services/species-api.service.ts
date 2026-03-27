import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { SpeciesListApiResponse, SpeciesListQuery } from '../models/species.model';

@Injectable({
  providedIn: 'root',
})
export class SpeciesApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('species');

  list(query: SpeciesListQuery): Observable<SpeciesListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<SpeciesListApiResponse>(this.listUrl, { params });
  }
}
