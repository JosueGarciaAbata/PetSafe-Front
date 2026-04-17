import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { PetListItemApiResponse } from '@app/pets/models/pet-list.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import { ReportsApiService } from '../api/reports-api.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent implements OnInit, OnDestroy {
  private readonly petsApi = inject(PetsApiService);
  private readonly reportsApi = inject(ReportsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchRequestVersion = 0;
  private pdfObjectUrl: string | null = null;
  private readonly patientPageSize = 6;

  protected searchValue = '';
  protected searchResults: PetListItemApiResponse[] = [];
  protected patientMeta: PaginationMeta = EMPTY_PAGINATION_META;
  protected selectedPatient: PetListItemApiResponse | null = null;
  protected isSearching = false;
  protected isGenerating = false;
  protected activeGenerationKey: 'clinical-history' | 'appointments' | null = null;
  protected searchError: string | null = null;
  protected actionError: string | null = null;
  protected successMessage: string | null = null;
  protected isPreviewOpen = false;
  protected previewUrl: SafeResourceUrl | null = null;
  protected previewTitle = 'Vista previa PDF';
  protected previewSubject = '';
  protected appointmentsFrom = '';
  protected appointmentsTo = '';

  ngOnInit(): void {
    const today = this.todayIso();
    this.appointmentsFrom = today;
    this.appointmentsTo = today;
    void this.loadPatients();
  }

  ngOnDestroy(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
    }

    this.clearPreviewUrl();
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.selectedPatient = null;
    this.actionError = null;
    this.successMessage = null;
    this.scheduleSearch();
  }

  protected retrySearch(): void {
    void this.loadPatients(this.patientMeta.currentPage);
  }

  protected onPatientPageChange(page: number): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }

    void this.loadPatients(page);
  }

  protected selectPatient(patient: PetListItemApiResponse): void {
    this.selectedPatient = patient;
    this.actionError = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  protected async openClinicalHistoryPreview(patient?: PetListItemApiResponse): Promise<void> {
    const targetPatient = patient ?? this.selectedPatient;
    if (!targetPatient || this.isGenerating) {
      return;
    }

    this.selectedPatient = targetPatient;
    this.isGenerating = true;
    this.activeGenerationKey = 'clinical-history';
    this.actionError = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      const blob = await firstValueFrom(this.reportsApi.downloadClinicalHistoryPdf(targetPatient.id));
      const filename = `historial-clinico-${this.slugify(targetPatient.name)}-${targetPatient.id}.pdf`;
      this.setPreviewBlob(blob);
      this.previewTitle = 'Historial clinico del paciente';
      this.previewSubject = targetPatient.name;
      this.successMessage = `Vista previa generada para ${targetPatient.name}.`;
      this.isPreviewOpen = true;
    } catch {
      this.actionError =
        'No se pudo generar el historial clinico del paciente seleccionado.';
    } finally {
      this.isGenerating = false;
      this.activeGenerationKey = null;
      this.cdr.markForCheck();
    }
  }

  protected async openAppointmentsPreview(): Promise<void> {
    if (this.isGenerating) {
      return;
    }

    const from = this.appointmentsFrom.trim();
    const to = this.appointmentsTo.trim();

    if (!from || !to) {
      this.actionError = 'Debes indicar la fecha inicial y final para generar la agenda.';
      this.successMessage = null;
      this.cdr.markForCheck();
      return;
    }

    if (from > to) {
      this.actionError = 'La fecha inicial no puede ser mayor que la fecha final.';
      this.successMessage = null;
      this.cdr.markForCheck();
      return;
    }

    this.isGenerating = true;
    this.activeGenerationKey = 'appointments';
    this.actionError = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      const blob = await firstValueFrom(this.reportsApi.downloadAppointmentsPdf(from, to));
      this.setPreviewBlob(blob);
      this.previewTitle = 'Agenda de citas';
      this.previewSubject = from === to ? from : `${from} a ${to}`;
      this.successMessage =
        from === to
          ? `Vista previa generada para la agenda del ${from}.`
          : `Vista previa generada para la agenda del ${from} al ${to}.`;
      this.isPreviewOpen = true;
    } catch {
      this.actionError = 'No se pudo generar la agenda en PDF para el rango seleccionado.';
    } finally {
      this.isGenerating = false;
      this.activeGenerationKey = null;
      this.cdr.markForCheck();
    }
  }

  protected closePreview(): void {
    this.isPreviewOpen = false;
    this.cdr.markForCheck();
  }

  protected onAppointmentsFromChange(value: string): void {
    this.appointmentsFrom = value;
    this.actionError = null;
    this.successMessage = null;
  }

  protected onAppointmentsToChange(value: string): void {
    this.appointmentsTo = value;
    this.actionError = null;
    this.successMessage = null;
  }

  protected buildPatientSubtitle(patient: PetListItemApiResponse): string {
    const species = patient.species?.name?.trim() || 'Especie no registrada';
    const breed = patient.breed?.name?.trim() || 'Raza no registrada';
    return `${species} - ${breed}`;
  }

  protected buildPatientMeta(patient: PetListItemApiResponse): string {
    const tutor = patient.tutorName?.trim() || 'Sin tutor registrado';
    const contact = patient.tutorContact?.trim() || 'Sin contacto registrado';
    return `${tutor} | ${contact}`;
  }

  protected getInitials(name: string): string {
    const trimmedName = name.trim();
    return trimmedName.charAt(0).toUpperCase() || 'P';
  }

  private scheduleSearch(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      void this.loadPatients(1);
    }, 300);
  }

  private async loadPatients(page = 1): Promise<void> {
    const requestToken = ++this.searchRequestVersion;
    this.isSearching = true;
    this.searchError = null;
    this.searchResults = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.petsApi.list({
          page,
          limit: this.patientPageSize,
          search: this.searchValue.trim() || undefined,
        }),
      );

      if (requestToken !== this.searchRequestVersion) {
        return;
      }

      this.searchResults = response.data;
      this.patientMeta = response.meta;

      if (this.selectedPatient) {
        this.selectedPatient =
          response.data.find((patient) => patient.id === this.selectedPatient?.id) ?? null;
      }
    } catch {
      if (requestToken !== this.searchRequestVersion) {
        return;
      }

      this.searchError = 'No se pudieron cargar los pacientes.';
      this.patientMeta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.searchRequestVersion) {
        return;
      }

      this.isSearching = false;
      this.cdr.detectChanges();
    }
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private setPreviewBlob(blob: Blob): void {
    this.clearPreviewUrl();
    this.pdfObjectUrl = URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl);
  }

  private clearPreviewUrl(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }

    this.previewUrl = null;
  }
}
