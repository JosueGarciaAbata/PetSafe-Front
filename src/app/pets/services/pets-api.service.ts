import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { CreatePetRequest } from '../models/create-pet.model';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
import { PetListApiResponse, PetListQuery } from '../models/pet-list.model';
import { UpdatePetBasicRequest } from '../models/update-pet-basic.model';

@Injectable({
  providedIn: 'root',
})
export class PetsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('patients/admin/all-basic');
  private readonly createUrl = buildApiUrl('patients');

  list(query: PetListQuery): Observable<PetListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<PetListApiResponse>(this.listUrl, { params });
  }

  create(payload: CreatePetRequest): Observable<unknown> {
    return this.http.post<unknown>(this.createUrl, payload);
  }

  getBasicById(id: number | string): Observable<PetBasicDetailApiResponse> {
    return this.http.get<PetBasicDetailApiResponse>(
      buildApiUrl(`patients/admin/${id}/basic`),
    );
  }

  updateBasic(
    id: number | string,
    payload: UpdatePetBasicRequest,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http.patch<PetBasicDetailApiResponse>(
      buildApiUrl(`patients/admin/${id}/basic`),
      payload,
    );
  }
}
