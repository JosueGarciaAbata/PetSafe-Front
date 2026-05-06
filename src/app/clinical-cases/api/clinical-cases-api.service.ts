import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl } from '@app/core/config/api.config';
import { ScheduleControlAppointmentRequest } from '@app/encounters/models/encounter.model';
import {
  ClinicalCaseDetail,
  ClinicalCaseStatus,
  ClinicalCaseSummary,
} from '../models/clinical-case.model';

@Injectable({
  providedIn: 'root',
})
export class ClinicalCasesApiService {
  private readonly http = inject(HttpClient);

  listByPatient(patientId: number | string): Observable<ClinicalCaseSummary[]> {
    return this.http.get<ClinicalCaseSummary[]>(
      buildApiUrl(`patients/${encodeURIComponent(String(patientId))}/clinical-cases`),
    );
  }

  getById(caseId: number | string): Observable<ClinicalCaseDetail> {
    return this.http.get<ClinicalCaseDetail>(
      buildApiUrl(`clinical-cases/${encodeURIComponent(String(caseId))}`),
    );
  }

  updateStatus(caseId: number | string, status: ClinicalCaseStatus): Observable<ClinicalCaseDetail> {
    return this.http.patch<ClinicalCaseDetail>(
      buildApiUrl(`clinical-cases/${encodeURIComponent(String(caseId))}/status`),
      { status },
    );
  }

  scheduleFollowUp(
    caseId: number | string,
    payload: ScheduleControlAppointmentRequest,
  ): Observable<ClinicalCaseDetail> {
    return this.http.post<ClinicalCaseDetail>(
      buildApiUrl(`clinical-cases/${encodeURIComponent(String(caseId))}/follow-ups`),
      payload,
    );
  }
}
