import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import {
  TreatmentListItemApiResponse,
  TreatmentStatusApiResponse,
} from '../models/treatment-list.model';
import { TreatmentsApiService } from '../api/treatments-api.service';

@Component({
  selector: 'app-treatments-page',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './treatments-page.component.html',
  styleUrl: './treatments-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentsPageComponent implements OnInit {
  private readonly treatmentsApi = inject(TreatmentsApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;

  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected treatments: TreatmentListItemApiResponse[] = [];
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected searchValue = '';
  protected selectedStatus: TreatmentStatusApiResponse | null = null;
  protected isLoading = false;
  protected loadError: string | null = null;

  ngOnInit(): void {
    void this.loadTreatments(1);
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadTreatments(page);
  }

  protected onStatusChange(status: TreatmentStatusApiResponse | null): void {
    if (this.selectedStatus === status) {
      return;
    }

    this.selectedStatus = status;
    this.clearSearchTimer();
    void this.loadTreatments(1);
  }

  protected retryLoadTreatments(): void {
    void this.loadTreatments(this.meta.currentPage);
  }

  protected openTreatmentDetail(treatment: TreatmentListItemApiResponse): void {
    void this.router.navigate(['/treatments', treatment.id], {
      state: {
        backTarget: ['/treatments'],
        backLabel: 'Volver a tratamientos',
      },
    });
  }

  protected clearFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.searchValue = '';
    this.selectedStatus = null;
    this.clearSearchTimer();
    void this.loadTreatments(1);
  }

  protected get hasActiveFilters(): boolean {
    return this.searchValue.trim().length > 0 || this.selectedStatus !== null;
  }

  protected buildPatientName(treatment: TreatmentListItemApiResponse): string {
    return treatment.patientName?.trim() || 'Mascota sin nombre';
  }

  protected buildStatusLabel(status: TreatmentStatusApiResponse): string {
    switch (status) {
      case 'ACTIVO':
        return 'Activo';
      case 'FINALIZADO':
        return 'Finalizado';
      case 'SUSPENDIDO':
        return 'Suspendido';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return 'Sin estado';
    }
  }

  protected buildStatusClasses(status: TreatmentStatusApiResponse): string {
    switch (status) {
      case 'ACTIVO':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'FINALIZADO':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'SUSPENDIDO':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'CANCELADO':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-border bg-background text-text-secondary';
    }
  }

  protected isFilterSelected(status: TreatmentStatusApiResponse | null): boolean {
    return this.selectedStatus === status;
  }

  protected buildStartDateLabel(treatment: TreatmentListItemApiResponse): string {
    return this.formatDate(treatment.startDate);
  }

  protected buildEndDateLabel(treatment: TreatmentListItemApiResponse): string {
    return treatment.endDate ? this.formatDate(treatment.endDate) : 'En curso';
  }

  protected buildGeneralInstructions(treatment: TreatmentListItemApiResponse): string {
    return treatment.generalInstructions?.trim() || 'Sin instrucciones registradas';
  }

  protected buildEncounterLabel(treatment: TreatmentListItemApiResponse): string {
    return `Consulta #${treatment.encounterId}`;
  }

  protected trackItem(index: number, item: TreatmentListItemApiResponse): number {
    return item.id ?? index;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadTreatments(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadTreatments(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.treatments = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.treatmentsApi.list({
          page,
          limit: this.pageSize,
          search: this.searchValue.trim() || undefined,
          status: this.selectedStatus ?? undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.treatments = response.data;
      this.meta = response.meta;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el listado de tratamientos.';
      this.meta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return value.slice(0, 10);
  }
}
