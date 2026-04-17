import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { CatalogAdminFormPayload, CatalogAdminItem } from '../models/catalog-admin.model';

@Injectable({ providedIn: 'root' })
export class CatalogAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('catalogs');

  listProcedures(includeInactive = false): Observable<CatalogAdminItem[]> {
    return this.http.get<CatalogAdminItem[]>(`${this.baseUrl}/procedures`, {
      params: new HttpParams().set('includeInactive', String(includeInactive)),
    });
  }

  createProcedure(payload: CatalogAdminFormPayload): Observable<CatalogAdminItem> {
    return this.http.post<CatalogAdminItem>(`${this.baseUrl}/procedures`, payload);
  }

  updateProcedure(
    procedureId: number,
    payload: CatalogAdminFormPayload,
  ): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/procedures/${procedureId}`, payload);
  }

  deactivateProcedure(procedureId: number): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/procedures/${procedureId}/deactivate`, {});
  }

  reactivateProcedure(procedureId: number): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/procedures/${procedureId}/reactivate`, {});
  }

  deleteProcedure(procedureId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/procedures/${procedureId}`);
  }

  listSurgeries(includeInactive = false): Observable<CatalogAdminItem[]> {
    return this.http.get<CatalogAdminItem[]>(`${this.baseUrl}/surgeries`, {
      params: new HttpParams().set('includeInactive', String(includeInactive)),
    });
  }

  createSurgery(payload: CatalogAdminFormPayload): Observable<CatalogAdminItem> {
    return this.http.post<CatalogAdminItem>(`${this.baseUrl}/surgeries`, payload);
  }

  updateSurgery(surgeryId: number, payload: CatalogAdminFormPayload): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/surgeries/${surgeryId}`, payload);
  }

  deactivateSurgery(surgeryId: number): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/surgeries/${surgeryId}/deactivate`, {});
  }

  reactivateSurgery(surgeryId: number): Observable<CatalogAdminItem> {
    return this.http.patch<CatalogAdminItem>(`${this.baseUrl}/surgeries/${surgeryId}/reactivate`, {});
  }

  deleteSurgery(surgeryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/surgeries/${surgeryId}`);
  }
}
