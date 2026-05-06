import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';

export interface PublicPetProfileResponse {
  id: number;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  color: string | null;
  birthDate: string | null;
  distinguishingMarks: string | null;
  microchipCode: string | null;
  image: { url: string } | null;
  owner: {
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class PetPublicApiService {
  private readonly http = inject(HttpClient);

  getByQrToken(qrToken: string): Observable<PublicPetProfileResponse> {
    return this.http.get<PublicPetProfileResponse>(
      buildApiUrl(`public/patients/${encodeURIComponent(qrToken)}`),
    );
  }
}
