import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  ChangePatientVaccinationSchemeRequest,
  CreatePatientVaccineApplicationRequest,
  PatientVaccineRecord,
  PatientVaccinationPlan,
  VaccineCatalogItem,
} from '../models/patient-vaccination-plan.model';

@Injectable({
  providedIn: 'root',
})
export class PatientVaccinationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('vaccinations');

  getPatientPlan(patientId: number | string): Observable<PatientVaccinationPlan> {
    return this.http.get<PatientVaccinationPlan>(
      `${this.baseUrl}/patients/${encodeURIComponent(String(patientId))}/plan`,
    );
  }

  listProducts(speciesId?: number | string | null): Observable<VaccineCatalogItem[]> {
    let params = new HttpParams();

    if (speciesId !== undefined && speciesId !== null && speciesId !== '') {
      params = params.set('speciesId', String(speciesId));
    }

    return this.http.get<VaccineCatalogItem[]>(`${this.baseUrl}/products`, { params });
  }

  addPatientApplication(
    patientId: number | string,
    payload: CreatePatientVaccineApplicationRequest,
  ): Observable<PatientVaccineRecord> {
    return this.http.post<PatientVaccineRecord>(
      `${this.baseUrl}/patients/${encodeURIComponent(String(patientId))}/applications`,
      payload,
    );
  }

  changePatientVaccinationScheme(
    patientId: number | string,
    payload: ChangePatientVaccinationSchemeRequest,
  ): Observable<PatientVaccinationPlan> {
    return this.http.patch<PatientVaccinationPlan>(
      buildApiUrl(`patients/${encodeURIComponent(String(patientId))}/vaccination-scheme`),
      payload,
    );
  }
}
