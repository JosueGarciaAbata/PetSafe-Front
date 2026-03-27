import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { CreateClientRequest } from '../models/client-create.model';
import { ClientPetApiResponse } from '../models/client-pet.model';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import {
  ClientTutorBasicListApiResponse,
  ClientTutorBasicQuery,
} from '../models/client-tutor-basic.model';
import { UpdateClientRequest } from '../models/client-update.model';
import {
  ClientSummaryListApiResponse,
  ClientSummaryQuery,
} from '../models/client-summary.model';

@Injectable({ providedIn: 'root' })
export class OwnersApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('clients/summary/list');
  private readonly createUrl = buildApiUrl('clients');
  private readonly tutorsBasicUrl = buildApiUrl('clients/tutors/basic');

  listSummary(query: ClientSummaryQuery): Observable<ClientSummaryListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.searchTerm?.trim();
    if (searchTerm) {
      params = params
        .set('firstName', searchTerm)
        .set('email', searchTerm)
        .set('petName', searchTerm);
    }

    return this.http.get<ClientSummaryListApiResponse>(this.listUrl, { params });
  }

  createClient(payload: CreateClientRequest): Observable<unknown> {
    return this.http.post<unknown>(this.createUrl, payload);
  }

  listBasicTutors(
    query: ClientTutorBasicQuery,
  ): Observable<ClientTutorBasicListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<ClientTutorBasicListApiResponse>(this.tutorsBasicUrl, {
      params,
    });
  }

  updateClient(
    id: string | number,
    payload: UpdateClientRequest,
  ): Observable<ClientResponseApiResponse> {
    return this.http.patch<ClientResponseApiResponse>(
      buildApiUrl(`clients/${encodeURIComponent(String(id))}`),
      payload,
    );
  }

  getClientById(id: string | number): Observable<ClientResponseApiResponse> {
    return this.http.get<ClientResponseApiResponse>(buildApiUrl(`clients/${encodeURIComponent(String(id))}`));
  }

  getClientPets(clientId: string | number): Observable<ClientPetApiResponse[]> {
    return this.http.get<ClientPetApiResponse[]>(
      buildApiUrl(`patients/admin/by-client/${encodeURIComponent(String(clientId))}`),
    );
  }
}
