import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HistoryApiService } from '../api/history-api.service';
import {
  ClinicalHistoryEncounterItem,
  ClinicalHistoryPatient,
  ClinicalHistoryResponse,
  ClinicalHistoryTutor,
  ClinicalHistoryVaccinationPlan,
} from '../models/clinical-history.model';

@Component({
  selector: 'app-history-detail-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryDetailPageComponent implements OnInit {
  private readonly historyApi = inject(HistoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected history: ClinicalHistoryResponse | null = null;
  protected isLoading = false;
  protected loadError: string | null = null;

  private readonly expandedEncounterIds = new Set<number>();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/history']);
      return;
    }

    void this.load(id);
  }

  protected isEncounterExpanded(encounterId: number): boolean {
    return this.expandedEncounterIds.has(encounterId);
  }

  protected toggleEncounter(encounterId: number): void {
    if (this.expandedEncounterIds.has(encounterId)) {
      this.expandedEncounterIds.delete(encounterId);
    } else {
      this.expandedEncounterIds.add(encounterId);
    }
  }

  protected retryLoad(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      void this.load(id);
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/history']);
  }

  protected get patient(): ClinicalHistoryPatient | null {
    return this.history?.patient ?? null;
  }

  protected get encounters(): ClinicalHistoryEncounterItem[] {
    return this.history?.encounters ?? [];
  }

  protected get vaccinationPlan(): ClinicalHistoryVaccinationPlan | null {
    return this.history?.vaccinationPlan ?? null;
  }

  protected get primaryTutor(): ClinicalHistoryTutor | null {
    return this.patient?.tutors.find((t) => t.isPrimary) ?? this.patient?.tutors[0] ?? null;
  }

  protected buildInitials(patient: ClinicalHistoryPatient): string {
    const name = patient.name.trim();
    if (!name) return `P${String(patient.id).slice(-1)}`;
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase() || `P${String(patient.id).slice(-1)}`;
  }

  protected buildSexLabel(sex: string): string {
    const s = sex?.trim().toUpperCase();
    if (s === 'MACHO') return 'Macho';
    if (s === 'HEMBRA') return 'Hembra';
    return s || '—';
  }

  protected buildAgeLabel(patient: ClinicalHistoryPatient): string {
    if (patient.ageYears === null) return '—';
    if (patient.ageYears === 0) return '< 1 año';
    return `${patient.ageYears} año${patient.ageYears === 1 ? '' : 's'}`;
  }

  protected buildDateLabel(isoDate: string | null): string {
    if (!isoDate) return '—';
    return new Intl.DateTimeFormat('es-EC', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected buildDateTimeLabel(isoDate: string | null): string {
    if (!isoDate) return '—';
    return new Intl.DateTimeFormat('es-EC', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDate));
  }

  protected buildEncounterStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVA': return 'En atención';
      case 'FINALIZADA': return 'Finalizada';
      case 'ANULADA': return 'Anulada';
      default: return status;
    }
  }

  protected buildEncounterStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVA': return 'bg-[#eff6ff] text-[#1d4ed8]';
      case 'FINALIZADA': return 'bg-[#f0fdf4] text-[#15803d]';
      case 'ANULADA': return 'bg-[#fef2f2] text-[#b91c1c]';
      default: return 'bg-[#f1f5f9] text-text-secondary';
    }
  }

  protected buildVaccinationDoseStatusLabel(status: string): string {
    switch (status) {
      case 'APLICADA': return 'Aplicada';
      case 'NO_APLICADA': return 'Pendiente';
      case 'VENCIDA': return 'Vencida';
      case 'CANCELADA': return 'Cancelada';
      default: return status;
    }
  }

  protected buildVaccinationDoseStatusClasses(status: string): string {
    switch (status) {
      case 'APLICADA': return 'bg-[#f0fdf4] text-[#15803d]';
      case 'NO_APLICADA': return 'bg-[#eff6ff] text-[#1d4ed8]';
      case 'VENCIDA': return 'bg-[#fef2f2] text-[#b91c1c]';
      case 'CANCELADA': return 'bg-[#fff7ed] text-[#c2410c]';
      default: return 'bg-[#f1f5f9] text-text-secondary';
    }
  }

  protected buildTreatmentStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVO': return 'Activo';
      case 'COMPLETADO': return 'Completado';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  }

  protected buildTreatmentStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVO': return 'bg-[#eff6ff] text-[#1d4ed8]';
      case 'COMPLETADO': return 'bg-[#f0fdf4] text-[#15803d]';
      case 'CANCELADO': return 'bg-[#fef2f2] text-[#b91c1c]';
      default: return 'bg-[#f1f5f9] text-text-secondary';
    }
  }

  protected buildSurgeryStatusLabel(status: string): string {
    switch (status) {
      case 'PROGRAMADA': return 'Programada';
      case 'REALIZADA': return 'Realizada';
      case 'CANCELADA': return 'Cancelada';
      default: return status;
    }
  }

  protected hasClinicalData(enc: ClinicalHistoryEncounterItem): boolean {
    return !!(
      enc.consultationReason ||
      enc.anamnesis ||
      enc.clinicalExam ||
      enc.clinicalImpression ||
      enc.plan ||
      enc.treatments.length > 0 ||
      enc.vaccinationEvents.length > 0 ||
      enc.dewormingEvents.length > 0 ||
      enc.surgeries.length > 0 ||
      enc.procedures.length > 0
    );
  }

  private async load(patientId: number): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.history = null;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(this.historyApi.getClinicalHistory(patientId));
      this.history = response;

      if (response.encounters.length > 0) {
        this.expandedEncounterIds.add(response.encounters[0].id);
      }
    } catch {
      this.loadError = 'No se pudo cargar el historial clínico.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
