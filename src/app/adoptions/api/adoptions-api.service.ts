import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdoptionCreateRequest, AdoptionRecord, AdoptionUpdateRequest } from '../models/adoption.model';

@Injectable({
  providedIn: 'root',
})
export class AdoptionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}adoptions`;

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

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
