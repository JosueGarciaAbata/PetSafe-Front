import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
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
  private cachedAllResponse: ZootecnicalGroupListApiResponse | null = null;

  list(query: ZootecnicalGroupListQuery): Observable<ZootecnicalGroupListApiResponse> {
    if (this.cachedAllResponse) {
      return of(this.filterLocalResponse(this.cachedAllResponse, query));
    }

    // Force limit 1000 to fetch all items for caching
    let params = new HttpParams()
      .set('page', 1)
      .set('limit', 1000);

    return this.http.get<ZootecnicalGroupListApiResponse>(this.listUrl, { params }).pipe(
      tap((response) => {
        this.cachedAllResponse = response;
      }),
      map((response) => this.filterLocalResponse(response, query))
    );
  }

  clearCache(): void {
    this.cachedAllResponse = null;
  }

  private filterLocalResponse(
    response: ZootecnicalGroupListApiResponse,
    query: ZootecnicalGroupListQuery,
  ): ZootecnicalGroupListApiResponse {
    let filteredData = [...response.data];
    const searchTerm = query.search?.trim().toLocaleLowerCase();

    if (searchTerm) {
      filteredData = filteredData.filter((item) =>
        item.name.toLocaleLowerCase().includes(searchTerm),
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 100;
    const startIndex = (page - 1) * limit;
    const paginatedData = filteredData.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      meta: {
        ...response.meta,
        totalItems: filteredData.length,
        itemCount: paginatedData.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(filteredData.length / limit),
        currentPage: page,
      },
    };
  }
}
