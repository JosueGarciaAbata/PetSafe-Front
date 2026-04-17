import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import { VaccinationRecordListItem } from '../models/vaccination-admin.model';
import { CreateVaccinationRecordModalComponent } from './create-vaccination-record-modal.component';

@Component({
  selector: 'app-vaccination-records-page',
  standalone: true,
  imports: [CommonModule, PaginationComponent, CreateVaccinationRecordModalComponent],
  templateUrl: './vaccination-records-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationRecordsPageComponent implements OnInit {
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;
  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected vaccinations: VaccinationRecordListItem[] = [];
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected searchValue = '';
  protected selectedExternal: 'true' | 'false' | null = null;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected isCreateModalOpen = false;

  ngOnInit(): void {
    void this.loadVaccinations(1);
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadVaccinations(page);
  }

  protected onExternalFilterChange(value: 'true' | 'false' | null): void {
    if (this.selectedExternal === value) {
      return;
    }

    this.selectedExternal = value;
    this.clearSearchTimer();
    void this.loadVaccinations(1);
  }

  protected retryLoadVaccinations(): void {
    void this.loadVaccinations(this.meta.currentPage);
  }

  protected canCreateVaccination(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected openCreateModal(): void {
    if (!this.canCreateVaccination()) {
      return;
    }

    this.isCreateModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.cdr.detectChanges();
  }

  protected onVaccinationCreated(): void {
    this.isCreateModalOpen = false;
    void this.loadVaccinations(1);
  }

  protected clearFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.searchValue = '';
    this.selectedExternal = null;
    this.clearSearchTimer();
    void this.loadVaccinations(1);
  }

  protected get hasActiveFilters(): boolean {
    return this.searchValue.trim().length > 0 || this.selectedExternal !== null;
  }

  protected isFilterSelected(value: 'true' | 'false' | null): boolean {
    return this.selectedExternal === value;
  }

  protected buildPatientName(item: VaccinationRecordListItem): string {
    return item.patientName?.trim() || 'Mascota sin nombre';
  }

  protected buildEncounterLabel(item: VaccinationRecordListItem): string {
    return item.encounterId ? `Consulta #${item.encounterId}` : 'Sin consulta';
  }

  protected buildVaccineName(item: VaccinationRecordListItem): string {
    return item.vaccineName?.trim() || 'Vacuna sin nombre';
  }

  protected buildApplicationDateLabel(item: VaccinationRecordListItem): string {
    return this.formatDate(item.applicationDate);
  }

  protected buildNextDoseDateLabel(item: VaccinationRecordListItem): string {
    return item.nextDoseDate ? this.formatDate(item.nextDoseDate) : 'Sin proxima dosis';
  }

  protected buildOriginLabel(item: VaccinationRecordListItem): string {
    return item.isExternal ? 'Externa' : 'Interna';
  }

  protected buildNotesLabel(item: VaccinationRecordListItem): string {
    return item.notes?.trim() || 'Sin notas';
  }

  protected buildOriginClasses(item: VaccinationRecordListItem): string {
    return item.isExternal
      ? 'border-slate-200 bg-slate-100 text-slate-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  protected trackItem(index: number, item: VaccinationRecordListItem): number {
    return item.id ?? index;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadVaccinations(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadVaccinations(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.vaccinations = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.vaccinationApi.listBasic({
          page,
          limit: this.pageSize,
          search: this.searchValue.trim() || undefined,
          isExternal: this.selectedExternal,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.vaccinations = response.data;
      this.meta = response.meta;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el listado de vacunaciones.';
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
