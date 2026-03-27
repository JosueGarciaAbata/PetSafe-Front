import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  ColorApiResponse,
  ColorListApiResponse,
  ColorListQuery,
  CreateColorRequest,
} from '../models/color.model';

@Injectable({
  providedIn: 'root',
})
export class ColorsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('colors');

  list(query: ColorListQuery): Observable<ColorListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<ColorListApiResponse>(this.listUrl, { params });
  }

  create(payload: CreateColorRequest): Observable<ColorApiResponse> {
    return this.http.post<ColorApiResponse>(this.listUrl, payload);
  }
}
