import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreateEncounterRequest,
  CreateEncounterProcedureRequest,
  CreateEncounterTreatmentRequest,
  CreateEncounterVaccinationRequest,
  EncounterAttachment,
  EncounterDetail,
  ProcedureCatalogItem,
  EncounterReason,
  EncounterAnamnesis,
  EncounterClinicalExam,
  EncounterEnvironmentalData,
  EncounterClinicalImpression,
  ScheduleControlAppointmentRequest,
  EncounterPlan,
  UpsertEncounterClinicalCaseLinkRequest,
  UpsertEncounterFollowUpConfigRequest,
} from '../models/encounter.model';
import { TreatmentEvolutionAction } from '@app/clinical-cases/models/clinical-case.model';

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
  finish(
    id: number,
    controlAppointment?: ScheduleControlAppointmentRequest,
  ): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(`${this.baseUrl}/${id}/finish`, {
      endTime: new Date().toISOString(),
      controlAppointment: controlAppointment ?? undefined,
    });
  }

  reactivate(id: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(`${this.baseUrl}/${id}/reactivate`, {});
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

  updateClinicalCaseLink(
    id: number,
    payload: UpsertEncounterClinicalCaseLinkRequest,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/clinical-case`, payload);
  }

  updateFollowUpConfig(
    id: number,
    payload: UpsertEncounterFollowUpConfigRequest,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(`${this.baseUrl}/${id}/follow-up-config`, payload);
  }

  addVaccination(
    id: number,
    payload: CreateEncounterVaccinationRequest,
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/vaccinations`, payload);
  }

  createVaccinationDraft(
    id: number,
    payload: CreateEncounterVaccinationRequest,
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/vaccination-drafts`, payload);
  }

  updateVaccinationDraft(
    id: number,
    draftId: number,
    payload: CreateEncounterVaccinationRequest,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(
      `${this.baseUrl}/${id}/vaccination-drafts/${draftId}`,
      payload,
    );
  }

  deleteVaccinationDraft(id: number, draftId: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(
      `${this.baseUrl}/${id}/vaccination-drafts/${draftId}/delete`,
      {},
    );
  }

  addTreatment(id: number, payload: CreateEncounterTreatmentRequest): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/treatments`, payload);
  }

  createTreatmentDraft(
    id: number,
    payload: CreateEncounterTreatmentRequest,
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/treatment-drafts`, payload);
  }

  updateTreatmentDraft(
    id: number,
    draftId: number,
    payload: CreateEncounterTreatmentRequest,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(
      `${this.baseUrl}/${id}/treatment-drafts/${draftId}`,
      payload,
    );
  }

  deleteTreatmentDraft(id: number, draftId: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(
      `${this.baseUrl}/${id}/treatment-drafts/${draftId}/delete`,
      {},
    );
  }

  upsertTreatmentReviewDraft(
    id: number,
    payload: {
      sourceTreatmentId: number;
      action: Exclude<TreatmentEvolutionAction, 'REEMPLAZA'>;
      notes?: string;
    },
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(
      `${this.baseUrl}/${id}/treatment-review-drafts`,
      payload,
    );
  }

  deleteTreatmentReviewDraft(id: number, draftId: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(
      `${this.baseUrl}/${id}/treatment-review-drafts/${draftId}/delete`,
      {},
    );
  }

  addProcedure(id: number, payload: CreateEncounterProcedureRequest): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/procedures`, payload);
  }

  createProcedureDraft(
    id: number,
    payload: CreateEncounterProcedureRequest,
  ): Observable<EncounterDetail> {
    return this.http.post<EncounterDetail>(`${this.baseUrl}/${id}/procedure-drafts`, payload);
  }

  updateProcedureDraft(
    id: number,
    draftId: number,
    payload: CreateEncounterProcedureRequest,
  ): Observable<EncounterDetail> {
    return this.http.put<EncounterDetail>(
      `${this.baseUrl}/${id}/procedure-drafts/${draftId}`,
      payload,
    );
  }

  deleteProcedureDraft(id: number, draftId: number): Observable<EncounterDetail> {
    return this.http.patch<EncounterDetail>(
      `${this.baseUrl}/${id}/procedure-drafts/${draftId}/delete`,
      {},
    );
  }

  listProcedureCatalog(includeInactive = false): Observable<ProcedureCatalogItem[]> {
    return this.http.get<ProcedureCatalogItem[]>(buildApiUrl('catalogs/procedures'), {
      params: { includeInactive: String(includeInactive) },
    });
  }

  // ── Attachments ──────────────────────────────────────────────────────────

  listAttachments(id: number): Observable<EncounterAttachment[]> {
    return this.http.get<EncounterAttachment[]>(`${this.baseUrl}/${id}/attachments`);
  }

  uploadAttachment(id: number, file: File): Observable<EncounterAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<EncounterAttachment>(`${this.baseUrl}/${id}/attachments`, formData);
  }

  deleteAttachment(id: number, fileId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}/attachments/${fileId}`);
  }
}
