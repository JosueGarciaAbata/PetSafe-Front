import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  ZootecnicalGroupListApiResponse,
  ZootecnicalGroupListQuery,
} from '../models/zootecnical-group.model';

@Injectable({
  providedIn: 'root',
})
export class ZootecnicalGroupsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('zootecnical-groups');

  list(query: ZootecnicalGroupListQuery): Observable<ZootecnicalGroupListApiResponse> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<ZootecnicalGroupListApiResponse>(this.listUrl, { params });
  }
}
