import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  ChangePatientVaccinationSchemeRequest,
  CreatePatientVaccineApplicationRequest,
  InitializePatientVaccinationPlanRequest,
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

  listProducts(options?: {
    speciesId?: number | string | null;
    onlyActive?: boolean | null;
    search?: string | null;
  }): Observable<VaccineCatalogItem[]> {
    let params = new HttpParams();

    if (options?.speciesId !== undefined && options?.speciesId !== null && options?.speciesId !== '') {
      params = params.set('speciesId', String(options.speciesId));
    }

    if (options?.onlyActive !== undefined && options?.onlyActive !== null) {
      params = params.set('onlyActive', String(options.onlyActive));
    }

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
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

  initializePatientVaccinationPlan(
    patientId: number | string,
    payload?: InitializePatientVaccinationPlanRequest,
  ): Observable<PatientVaccinationPlan> {
    return this.http.post<PatientVaccinationPlan>(
      buildApiUrl(`patients/${encodeURIComponent(String(patientId))}/vaccination-plan`),
      payload ?? {},
    );
  }
}
