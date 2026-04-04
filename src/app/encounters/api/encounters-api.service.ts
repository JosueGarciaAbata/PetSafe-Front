import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreateEncounterRequest,
  EncounterDetail,
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
  updateReason(id: number, payload: EncounterReason): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/consultation-reason`, payload);
  }

  updateAnamnesis(id: number, payload: EncounterAnamnesis): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/anamnesis`, payload);
  }

  updateClinicalExam(id: number, payload: EncounterClinicalExam): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/clinical-exam`, payload);
  }

  updateEnvironmentalData(id: number, payload: EncounterEnvironmentalData): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/environmental-data`, payload);
  }

  updateImpression(id: number, payload: EncounterClinicalImpression): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/clinical-impression`, payload);
  }

  updatePlan(id: number, payload: EncounterPlan): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/plan`, payload);
  }
}
