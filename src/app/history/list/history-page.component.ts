import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HistoryApiService } from '../api/history-api.service';
import { HistoryPatient } from '../models/history-patient.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './history-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPageComponent implements OnInit {
  private readonly historyApi = inject(HistoryApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSize = 10;

  protected patients: readonly HistoryPatient[] = [];
  protected paginationMeta: PaginationMeta = EMPTY_PAGINATION_META;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected generatingPdfForId: number | null = null;

  private requestVersion = 0;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadPatients(1);
      });

    void this.loadPatients(1);
  }

  protected buildInitials(patient: HistoryPatient): string {
    const name = patient.name.trim();
    if (!name) {
      return `P${String(patient.id).slice(-1)}`;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase() || `P${String(patient.id).slice(-1)}`;
  }

  protected buildSpeciesBreedLabel(patient: HistoryPatient): string {
    const parts = [patient.species?.name, patient.breed?.name].filter(Boolean);
    return parts.join(' · ') || 'Sin especie registrada';
  }

  protected buildTutorLabel(patient: HistoryPatient): string {
    return patient.tutorName?.trim() || 'Sin tutor registrado';
  }

  protected buildTutorContactLabel(patient: HistoryPatient): string {
    return patient.tutorContact?.trim() || '';
  }

  protected buildAgeLabel(patient: HistoryPatient): string {
    if (patient.ageYears === null) {
      return '—';
    }

    if (patient.ageYears === 0) {
      return '< 1 año';
    }

    return `${patient.ageYears} año${patient.ageYears === 1 ? '' : 's'}`;
  }

  protected buildSexLabel(patient: HistoryPatient): string {
    const sex = patient.sex?.trim().toUpperCase();
    if (sex === 'MACHO') {
      return 'Macho';
    }

    if (sex === 'HEMBRA') {
      return 'Hembra';
    }

    return sex || '—';
  }

  protected buildWeightLabel(patient: HistoryPatient): string {
    if (patient.currentWeight === null) {
      return '—';
    }

    return `${patient.currentWeight} kg`;
  }

  protected openPatientPdf(patient: HistoryPatient): void {
    if (this.generatingPdfForId !== null) return;
    this.generatingPdfForId = patient.id;
    this.cdr.markForCheck();

    firstValueFrom(this.historyApi.getClinicalHistoryPdf(patient.id))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .catch(() => {})
      .finally(() => {
        this.generatingPdfForId = null;
        this.cdr.markForCheck();
      });
  }

  protected onPageChange(page: number): void {
    void this.loadPatients(page);
  }

  protected retryLoad(): void {
    void this.loadPatients(this.paginationMeta.currentPage || 1);
  }

  private async loadPatients(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    const search = this.searchControl.value.trim();

    this.isLoading = true;
    this.loadError = null;
    this.patients = [];
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.historyApi.listPatients({
          page,
          limit: this.pageSize,
          search: search || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.patients = response?.data ?? [];
      this.paginationMeta = response?.meta ?? {
        ...EMPTY_PAGINATION_META,
        currentPage: page,
        itemCount: this.patients.length,
        totalItems: this.patients.length,
      };
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudieron cargar los pacientes.';
      this.paginationMeta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
