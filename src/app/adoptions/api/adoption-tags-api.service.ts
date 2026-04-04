import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { AdoptionTagSummaryApiResponse } from '../models/adoption-tag.model';

@Injectable({
  providedIn: 'root',
})
export class AdoptionTagsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('adoption-tags');
  private readonly searchSummaryUrl = buildApiUrl('adoption-tags/search-summary');

  searchSummary(search: string, limit = 10): Observable<AdoptionTagSummaryApiResponse[]> {
    const params = new HttpParams()
      .set('search', search.trim())
      .set('limit', limit);

    return this.http.get<AdoptionTagSummaryApiResponse[]>(this.searchSummaryUrl, { params });
  }

  create(name: string): Observable<AdoptionTagSummaryApiResponse> {
    return this.http.post<AdoptionTagSummaryApiResponse>(this.baseUrl, { name });
  }
}
