import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreateEncounterRequest,
  CreateEncounterProcedureRequest,
  CreateEncounterTreatmentRequest,
  CreateEncounterVaccinationRequest,
  EncounterDetail,
  ProcedureCatalogItem,
  EncounterReason,
  EncounterAnamnesis,
  EncounterClinicalExam,
  EncounterEnvironmentalData,
  EncounterClinicalImpression,
  EncounterPlan,
} from '../models/encounter.model';

@Injectable({
  providedIn: 'root',
})
export class EncountersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = buildApiUrl('encounters');

  // INICIO DE ATENCIÓN: Crear encuentro
  create(payload: CreateEncounterRequest): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(this.baseUrl, payload);
  }

  // OBTENER DETALLE CLÍNICO
  getById(id: number): Observable<EncounterDetail> {
    return this.http.get<EncounterDetail>(`${this.baseUrl}/${id}`);
  }

  // FINALIZAR
  finish(id: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(`${this.baseUrl}/${id}/finish`, {
      endTime: new Date().toISOString(),
    });
  }

  // PESTAÑAS (TABS) ACTUALIZAR
  updateReason(id: number, payload: EncounterReason): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/consultation-reason`, payload);
  }

  updateAnamnesis(id: number, payload: EncounterAnamnesis): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/anamnesis`, payload);
  }

  updateClinicalExam(id: number, payload: EncounterClinicalExam): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/clinical-exam`, payload);
  }

  updateEnvironmentalData(
    id: number,
    payload: EncounterEnvironmentalData,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/environmental-data`, payload);
  }

  updateImpression(
    id: number,
    payload: EncounterClinicalImpression,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/clinical-impression`, payload);
  }

  updatePlan(id: number, payload: EncounterPlan): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/plan`, payload);
  }

  addVaccination(
    id: number,
    payload: CreateEncounterVaccinationRequest,
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/vaccinations`, payload);
  }

  addTreatment(id: number, payload: CreateEncounterTreatmentRequest): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/treatments`, payload);
  }

  addProcedure(id: number, payload: CreateEncounterProcedureRequest): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/procedures`, payload);
  }

  listProcedureCatalog(includeInactive = false): Observable<ProcedureCatalogItem[]> {
    return this.http.get<ProcedureCatalogItem[]>(buildApiUrl('catalogs/procedures'), {
      params: { includeInactive: String(includeInactive) },
    });
  }
}
