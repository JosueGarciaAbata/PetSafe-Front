import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { buildApiUrl } from '@app/core/config/api.config';
import { SpeciesListApiResponse, SpeciesListQuery } from '../models/species.model';

@Injectable({
  providedIn: 'root',
})
export class SpeciesApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('species');
  private cachedAllResponse: SpeciesListApiResponse | null = null;

  list(query: SpeciesListQuery): Observable<SpeciesListApiResponse> {
    if (this.cachedAllResponse) {
      return of(this.filterLocalResponse(this.cachedAllResponse, query));
    }

    // Force limit 1000 to fetch all items for caching
    let params = new HttpParams()
      .set('page', 1)
      .set('limit', 1000);

    return this.http.get<SpeciesListApiResponse>(this.listUrl, { params }).pipe(
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
    response: SpeciesListApiResponse,
    query: SpeciesListQuery,
  ): SpeciesListApiResponse {
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
