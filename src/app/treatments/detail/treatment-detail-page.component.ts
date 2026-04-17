import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { TreatmentsApiService } from '../api/treatments-api.service';
import {
  CreateTreatmentItemRequest,
  TreatmentDetailApiResponse,
  TreatmentDetailItemApiResponse,
  TreatmentStatusApiResponse,
  UpdateTreatmentRequest,
} from '../models/treatment-list.model';

@Component({
  selector: 'app-treatment-detail-page',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule, ShellIconComponent],
  templateUrl: './treatment-detail-page.component.html',
  styleUrl: './treatment-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentDetailPageComponent implements OnInit {
  private readonly treatmentsApi = inject(TreatmentsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private requestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/treatments'];
  protected backLabel = 'Volver a tratamientos';

  protected isLoading = false;
  protected loadError: string | null = null;
  protected treatment: TreatmentDetailApiResponse | null = null;

  protected isEditModalOpen = false;
  protected isSavingTreatment = false;
  protected saveTreatmentError: string | null = null;
  protected readonly editTreatmentForm = new FormGroup({
    endDate: new FormControl('', {
      nonNullable: true,
    }),
    generalInstructions: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  protected isCreateItemModalOpen = false;
  protected isSavingItem = false;
  protected readonly createItemForm = new FormGroup({
    medication: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    dose: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    frequency: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    durationDays: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
    }),
    administrationRoute: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const navigationState = history.state as {
      backTarget?: readonly (string | number)[] | null;
      backLabel?: string | null;
    } | null;
    this.backTarget = navigationState?.backTarget ?? ['/treatments'];
    this.backLabel = navigationState?.backLabel?.trim() || 'Volver a tratamientos';

    this.route.paramMap.subscribe((params) => {
      const treatmentId = params.get('id');
      if (!treatmentId) {
        void this.router.navigate(['/treatments']);
        return;
      }

      const requestToken = ++this.requestVersion;
      this.isLoading = true;
      this.loadError = null;
      this.treatment = null;
      this.cdr.detectChanges();
      void this.loadTreatment(treatmentId, requestToken);
    });
  }

  protected goBack(): void {
    void this.router.navigate(this.backTarget, { replaceUrl: true });
  }

  protected canEditTreatment(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected canCreateItem(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']) && this.treatment?.status === 'ACTIVO';
  }

  protected openEditTreatmentModal(): void {
    if (!this.treatment || !this.canEditTreatment() || this.isSavingTreatment) {
      return;
    }

    this.editTreatmentForm.reset({
      endDate: this.treatment.endDate?.slice(0, 10) ?? '',
      generalInstructions: this.treatment.generalInstructions ?? '',
    });
    this.editTreatmentForm.markAsPristine();
    this.editTreatmentForm.markAsUntouched();
    this.saveTreatmentError = null;
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeEditTreatmentModal(): void {
    if (this.isSavingTreatment) {
      return;
    }

    this.isEditModalOpen = false;
    this.saveTreatmentError = null;
    this.cdr.detectChanges();
  }

  protected openCreateItemModal(): void {
    if (!this.canCreateItem() || this.isSavingItem) {
      return;
    }

    this.createItemForm.reset({
      medication: '',
      dose: '',
      frequency: '',
      durationDays: null,
      administrationRoute: '',
      notes: '',
    });
    this.createItemForm.markAsPristine();
    this.createItemForm.markAsUntouched();
    this.isCreateItemModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeCreateItemModal(): void {
    if (this.isSavingItem) {
      return;
    }

    this.isCreateItemModalOpen = false;
    this.cdr.detectChanges();
  }

  protected hasEditControlError(
    controlName: keyof typeof this.editTreatmentForm.controls,
    errorName: string,
  ): boolean {
    const control = this.editTreatmentForm.controls[controlName];
    return !!control && control.hasError(errorName) && (control.dirty || control.touched);
  }

  protected hasItemControlError(
    controlName: keyof typeof this.createItemForm.controls,
    errorName: string,
  ): boolean {
    const control = this.createItemForm.controls[controlName];
    return !!control && control.hasError(errorName) && (control.dirty || control.touched);
  }

  protected openDatePicker(input: HTMLInputElement): void {
    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  protected async submitEditTreatment(): Promise<void> {
    if (!this.treatment || this.isSavingTreatment) {
      return;
    }

    this.editTreatmentForm.markAllAsTouched();
    if (this.editTreatmentForm.invalid) {
      return;
    }

    const raw = this.editTreatmentForm.getRawValue();
    const payload: UpdateTreatmentRequest = {};
    const endDate = raw.endDate.trim();
    const generalInstructions = raw.generalInstructions.trim();

    if (endDate) {
      payload.endDate = endDate;
    }

    payload.generalInstructions = generalInstructions;

    this.isSavingTreatment = true;
    this.saveTreatmentError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.treatmentsApi.update(this.treatment.id, payload));
      this.treatment = response;
      this.isEditModalOpen = false;
    } catch (error: unknown) {
      this.saveTreatmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar el tratamiento.',
        clientErrorMessage: 'Revisa los datos del tratamiento.',
      });
    } finally {
      this.isSavingTreatment = false;
      this.cdr.detectChanges();
    }
  }

  protected async submitCreateItem(): Promise<void> {
    if (!this.treatment || this.isSavingItem) {
      return;
    }

    this.createItemForm.markAllAsTouched();
    if (this.createItemForm.invalid) {
      this.toast.info('Revisa los datos obligatorios del item.');
      return;
    }

    const raw = this.createItemForm.getRawValue();
    const payload: CreateTreatmentItemRequest = {
      medication: raw.medication.trim(),
      dose: raw.dose.trim(),
      frequency: raw.frequency.trim(),
      durationDays: Number(raw.durationDays),
      administrationRoute: raw.administrationRoute.trim(),
      notes: raw.notes.trim() || undefined,
    };

    this.isSavingItem = true;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.treatmentsApi.addItem(this.treatment.id, payload));
      this.treatment = response;
      this.isCreateItemModalOpen = false;
      this.toast.success('Item agregado correctamente.');
    } catch (error: unknown) {
      this.toast.error(resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo agregar el item del tratamiento.',
        clientErrorMessage: 'Revisa los datos del item.',
      }));
    } finally {
      this.isSavingItem = false;
      this.cdr.detectChanges();
    }
  }

  protected buildPatientName(): string {
    return this.treatment?.patientName?.trim() || 'Mascota sin nombre';
  }

  protected buildStatusLabel(status?: TreatmentStatusApiResponse | null): string {
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

  protected buildStatusClasses(status?: TreatmentStatusApiResponse | null): string {
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

  protected buildGeneralInstructions(): string {
    return this.treatment?.generalInstructions?.trim() || 'Sin instrucciones registradas.';
  }

  protected buildStartDateLabel(): string {
    return this.formatDate(this.treatment?.startDate ?? null);
  }

  protected buildEndDateLabel(): string {
    return this.treatment?.endDate ? this.formatDate(this.treatment.endDate) : 'En curso';
  }

  protected buildEncounterLabel(): string {
    return this.treatment ? `Consulta #${this.treatment.encounterId}` : 'Consulta no registrada';
  }

  protected buildDurationLabel(item: TreatmentDetailItemApiResponse): string {
    return `${item.durationDays} dia${item.durationDays === 1 ? '' : 's'}`;
  }

  protected buildItemNotes(item: TreatmentDetailItemApiResponse): string {
    return item.notes?.trim() || 'Sin observaciones.';
  }

  protected trackItem(index: number, item: TreatmentDetailItemApiResponse): number {
    return item.id ?? index;
  }

  private async loadTreatment(treatmentId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.treatmentsApi.getById(treatmentId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.treatment = response;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el detalle del tratamiento.';
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
