import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { buildApiUrl } from '@app/core/config/api.config';
import { SpeciesApiService } from '@app/pets/services/species-api.service';
import { ZootecnicalGroupsApiService } from '@app/pets/services/zootecnical-groups-api.service';
import {
  BreedFormPayload,
  BreedItem,
  PaginatedResponse,
  SpeciesFormPayload,
  SpeciesItem,
  ZootecnicalGroupFormPayload,
  ZootecnicalGroupItem,
} from '../models/zootecnia-catalog.model';

@Injectable({ providedIn: 'root' })
export class ZootecniaCatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly zootecnicalGroupsApi = inject(ZootecnicalGroupsApiService);

  private clearAllCaches(): void {
    this.speciesApi.clearCache();
    this.zootecnicalGroupsApi.clearCache();
  }

  /* ─── Grupos Zootécnicos ─── */

  private readonly zootecnicalGroupsUrl = buildApiUrl('zootecnical-groups');

  listZootecnicalGroups(
    page = 1,
    limit = 10,
    search?: string,
  ): Observable<PaginatedResponse<ZootecnicalGroupItem>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<ZootecnicalGroupItem>>(this.zootecnicalGroupsUrl, { params });
  }

  /** Obtiene todos los grupos (sin paginar) para usar en selects. */
  listAllZootecnicalGroups(): Observable<PaginatedResponse<ZootecnicalGroupItem>> {
    const params = new HttpParams().set('limit', '50').set('sortBy', 'name:ASC');
    return this.http.get<PaginatedResponse<ZootecnicalGroupItem>>(this.zootecnicalGroupsUrl, { params });
  }

  createZootecnicalGroup(payload: ZootecnicalGroupFormPayload): Observable<ZootecnicalGroupItem> {
    return this.http.post<ZootecnicalGroupItem>(this.zootecnicalGroupsUrl, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  updateZootecnicalGroup(id: number, payload: ZootecnicalGroupFormPayload): Observable<ZootecnicalGroupItem> {
    return this.http.patch<ZootecnicalGroupItem>(`${this.zootecnicalGroupsUrl}/${id}`, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  deleteZootecnicalGroup(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.zootecnicalGroupsUrl}/${id}`).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  /* ─── Especies ─── */

  private readonly speciesUrl = buildApiUrl('species');

  listSpecies(
    page = 1,
    limit = 10,
    search?: string,
  ): Observable<PaginatedResponse<SpeciesItem>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<SpeciesItem>>(this.speciesUrl, { params });
  }

  /** Obtiene todas las especies (sin paginar) para usar en selects. */
  listAllSpecies(): Observable<PaginatedResponse<SpeciesItem>> {
    const params = new HttpParams().set('limit', '50').set('sortBy', 'name:ASC');
    return this.http.get<PaginatedResponse<SpeciesItem>>(this.speciesUrl, { params });
  }

  createSpecies(payload: SpeciesFormPayload): Observable<SpeciesItem> {
    return this.http.post<SpeciesItem>(this.speciesUrl, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  updateSpecies(id: number, payload: SpeciesFormPayload): Observable<SpeciesItem> {
    return this.http.patch<SpeciesItem>(`${this.speciesUrl}/${id}`, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  deleteSpecies(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.speciesUrl}/${id}`).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  /* ─── Razas ─── */

  private readonly breedsUrl = buildApiUrl('breeds');

  listBreeds(
    page = 1,
    limit = 10,
    search?: string,
  ): Observable<PaginatedResponse<BreedItem>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<BreedItem>>(this.breedsUrl, { params });
  }

  createBreed(payload: BreedFormPayload): Observable<BreedItem> {
    return this.http.post<BreedItem>(this.breedsUrl, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  updateBreed(id: number, payload: BreedFormPayload): Observable<BreedItem> {
    return this.http.patch<BreedItem>(`${this.breedsUrl}/${id}`, payload).pipe(
      tap(() => this.clearAllCaches())
    );
  }

  deleteBreed(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.breedsUrl}/${id}`).pipe(
      tap(() => this.clearAllCaches())
    );
  }
}
