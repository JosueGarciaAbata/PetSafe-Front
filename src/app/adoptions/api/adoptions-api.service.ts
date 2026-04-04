import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  AdoptionBasicListApiResponse,
  AdoptionBasicListQuery,
  AdoptionBasicUpdateRequest,
  AdoptionBasicUpdateResponse,
  AdoptionCreateRequest,
  AdoptionRecord,
  AdoptionUpdateRequest,
} from '../models/adoption.model';

@Injectable({
  providedIn: 'root',
})
export class AdoptionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('adoptions');

  listBasic(query: AdoptionBasicListQuery): Observable<AdoptionBasicListApiResponse> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<AdoptionBasicListApiResponse>(buildApiUrl('adoptions/basic'), { params });
  }

  list(): Observable<AdoptionRecord[]> {
    return this.http.get<AdoptionRecord[]>(this.baseUrl);
  }

  get(id: number): Observable<AdoptionRecord> {
    return this.http.get<AdoptionRecord>(`${this.baseUrl}/${id}`);
  }

  create(data: AdoptionCreateRequest): Observable<AdoptionRecord> {
    return this.http.post<AdoptionRecord>(this.baseUrl, data);
  }

  update(id: number, data: AdoptionUpdateRequest): Observable<AdoptionRecord> {
    return this.http.patch<AdoptionRecord>(`${this.baseUrl}/${id}`, data);
  }

  updateBasic(id: number, data: AdoptionBasicUpdateRequest): Observable<AdoptionBasicUpdateResponse> {
    return this.http.patch<AdoptionBasicUpdateResponse>(
      `${this.baseUrl}/${id}/basic`,
      this.buildBasicUpdateFormData(data),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private buildBasicUpdateFormData(data: AdoptionBasicUpdateRequest): FormData {
    const formData = new FormData();

    this.appendTextField(formData, 'contactPhone', data.contactPhone);
    this.appendTextField(formData, 'story', data.story);
    this.appendTextField(formData, 'requirements', data.requirements);
    this.appendTextField(formData, 'notes', data.notes);
    this.appendTextField(formData, 'contactName', data.contactName);
    this.appendTextField(formData, 'contactEmail', data.contactEmail);

    for (const tagId of data.tagIds ?? []) {
      this.appendPrimitive(formData, 'tagIds', tagId);
    }

    if (data.image) {
      formData.append('image', data.image, data.image.name);
    }

    return formData;
  }

  private appendPrimitive(
    formData: FormData,
    key: string,
    value: string | number | boolean | null | undefined,
  ): void {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, String(value));
  }

  private appendTextField(
    formData: FormData,
    key: string,
    value: string | null | undefined,
  ): void {
    if (value === undefined || value === null) {
      return;
    }

    formData.append(key, value);
  }
}
