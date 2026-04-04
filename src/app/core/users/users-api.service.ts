import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { UserProfileApiResponse, VeterinarianSummaryApiResponse } from './users.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('users');

  getMe(): Observable<UserProfileApiResponse> {
    return this.http.get<UserProfileApiResponse>(`${this.baseUrl}/me`);
  }

  listVeterinarians(search?: string | null): Observable<VeterinarianSummaryApiResponse[]> {
    let params = new HttpParams();

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<VeterinarianSummaryApiResponse[]>(
      `${this.baseUrl}/veterinarians`,
      { params },
    );
  }
}
