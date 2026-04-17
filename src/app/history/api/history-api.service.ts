import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  HistoryPatientListQuery,
  HistoryPatientListResponse,
} from '../models/history-patient.model';
import { ClinicalHistoryResponse } from '../models/clinical-history.model';

@Injectable({ providedIn: 'root' })
export class HistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('patients/admin/all-basic');

  listPatients(query: HistoryPatientListQuery): Observable<HistoryPatientListResponse> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);

    if (query.search) {
      params = params.set('search', query.search);
    }

    return this.http.get<HistoryPatientListResponse>(this.listUrl, { params });
  }

  getClinicalHistoryPdf(patientId: number): Observable<Blob> {
    return this.http.get(
      buildApiUrl(`reports/patients/${encodeURIComponent(String(patientId))}/clinical-history/pdf`),
      { responseType: 'blob' },
    );
  }

  getClinicalHistory(patientId: number): Observable<ClinicalHistoryResponse> {
    return this.http.get<ClinicalHistoryResponse>(
      buildApiUrl(`patients/admin/${encodeURIComponent(String(patientId))}/clinical-history`),
    );
  }
}
