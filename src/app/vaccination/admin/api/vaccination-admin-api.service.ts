import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreateVaccinationProductRequest,
  CreateVaccinationSchemeRequest,
  CreateVaccinationSchemeVersionRequest,
  UpdateVaccinationProductRequest,
  UpdateVaccinationSchemeVersionStatusRequest,
  VaccinationRecordListResponse,
  VaccinationProductItem,
  VaccinationScheme,
  VaccinationSchemeVersion,
} from '../models/vaccination-admin.model';

@Injectable({ providedIn: 'root' })
export class VaccinationAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('vaccinations');

  listBasic(options?: {
    page?: number | null;
    limit?: number | null;
    search?: string | null;
    isExternal?: 'true' | 'false' | null;
  }): Observable<VaccinationRecordListResponse> {
    let params = new HttpParams();
    if (options?.page) {
      params = params.set('page', String(options.page));
    }

    if (options?.limit) {
      params = params.set('limit', String(options.limit));
    }

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    if (options?.isExternal !== undefined && options?.isExternal !== null) {
      params = params.set('isExternal', options.isExternal);
    }

    return this.http.get<VaccinationRecordListResponse>(`${this.baseUrl}/basic`, { params });
  }

  listProducts(options?: {
    speciesId?: number | null;
    onlyActive?: boolean | null;
    search?: string | null;
  }): Observable<VaccinationProductItem[]> {
    let params = new HttpParams();
    if (options?.speciesId) {
      params = params.set('speciesId', String(options.speciesId));
    }

    if (options?.onlyActive !== undefined && options?.onlyActive !== null) {
      params = params.set('onlyActive', String(options.onlyActive));
    }

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http.get<VaccinationProductItem[]>(`${this.baseUrl}/products`, { params });
  }

  createProduct(payload: CreateVaccinationProductRequest): Observable<VaccinationProductItem> {
    return this.http.post<VaccinationProductItem>(`${this.baseUrl}/products`, payload);
  }

  updateProduct(
    productId: number,
    payload: UpdateVaccinationProductRequest,
  ): Observable<VaccinationProductItem> {
    return this.http.put<VaccinationProductItem>(`${this.baseUrl}/products/${productId}`, payload);
  }

  deactivateProduct(productId: number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/products/${productId}`);
  }

  reactivateProduct(productId: number): Observable<{ message?: string }> {
    return this.http.patch<{ message?: string }>(
      `${this.baseUrl}/products/${productId}/reactivate`,
      {},
    );
  }

  listSchemes(speciesId?: number | null): Observable<VaccinationScheme[]> {
    let params = new HttpParams();
    if (speciesId) {
      params = params.set('speciesId', String(speciesId));
    }

    return this.http.get<VaccinationScheme[]>(`${this.baseUrl}/schemes`, { params });
  }

  getScheme(schemeId: number): Observable<VaccinationScheme> {
    return this.http.get<VaccinationScheme>(`${this.baseUrl}/schemes/${schemeId}`);
  }

  createScheme(payload: CreateVaccinationSchemeRequest): Observable<VaccinationScheme> {
    return this.http.post<VaccinationScheme>(`${this.baseUrl}/schemes`, payload);
  }

  createSchemeVersion(
    schemeId: number,
    payload: CreateVaccinationSchemeVersionRequest,
  ): Observable<VaccinationSchemeVersion> {
    return this.http.post<VaccinationSchemeVersion>(
      `${this.baseUrl}/schemes/${schemeId}/versions`,
      payload,
    );
  }

  updateSchemeVersionStatus(
    versionId: number,
    payload: UpdateVaccinationSchemeVersionStatusRequest,
  ): Observable<VaccinationSchemeVersion> {
    return this.http.patch<VaccinationSchemeVersion>(
      `${this.baseUrl}/schemes/versions/${versionId}/status`,
      payload,
    );
  }
}
