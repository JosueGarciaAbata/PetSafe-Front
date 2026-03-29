import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppointmentsApiService } from '../api/appointments-api.service';
import { CreateAppointmentRequest } from '../models/appointment-create.model';
import { AppointmentPatientSearchItemApiResponse } from '../models/appointment-patient-search.model';
import { getTodayDateKey } from '../utils/appointment-date.util';

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './create-appointment-modal.component.html',
  styleUrl: './create-appointment-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAppointmentModalComponent implements OnDestroy {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly patientSearchLimit = 10;
  private patientRequestVersion = 0;
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingPatient = false;

  protected readonly patientErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isPatientInvalid(),
  );
  protected readonly scheduledDateErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isScheduledDateInvalid(),
  );
  protected readonly scheduledTimeErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isScheduledTimeInvalid(),
  );
  protected readonly reasonErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isReasonInvalid(),
  );

  protected patientSearch = '';
  protected scheduledDate = getTodayDateKey();
  protected scheduledTime = this.getCurrentTime();
  protected reason = '';
  protected notes = '';

  protected selectedPatient: AppointmentPatientSearchItemApiResponse | null = null;
  protected patients: AppointmentPatientSearchItemApiResponse[] = [];
  protected isPatientsLoading = false;
  protected isSaving = false;
  protected showValidationErrors = false;
  protected submitError: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  ngOnDestroy(): void {
    this.clearPatientSearchTimer();
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.clearPatientSearchTimer();
    this.closed.emit();
  }

  protected patientOptions(): AppointmentPatientSearchItemApiResponse[] {
    return this.patients;
  }

  protected onPatientChanged(value: string): void {
    this.patientSearch = value;
    this.submitError = null;

    const normalizedValue = value.trim();
    const matchedPatient =
      this.patients.find((item) => this.buildPatientLabel(item) === normalizedValue) ?? null;

    if (this.isSelectingPatient) {
      this.isSelectingPatient = false;
      return;
    }

    this.selectedPatient = matchedPatient;
    if (matchedPatient) {
      this.clearPatientSearchTimer();
      return;
    }

    if (!normalizedValue) {
      this.clearPatientSearchTimer();
      this.patients = [];
      this.isPatientsLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.schedulePatientSearch();
  }

  protected onPatientOptionSelection(
    isUserInput: boolean,
    option: AppointmentPatientSearchItemApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingPatient = true;
    this.clearPatientSearchTimer();
    this.selectPatient(option);
  }

  protected buildPatientLabel(option: AppointmentPatientSearchItemApiResponse): string {
    const patientName = option.patientName.trim();
    const tutorName = option.tutorName.trim();
    return tutorName ? `${patientName} - ${tutorName}` : patientName;
  }

  protected buildPatientMeta(option: AppointmentPatientSearchItemApiResponse): string {
    const documentId = option.documentId?.trim();
    return documentId ? `CI ${documentId}` : 'Sin documento';
  }

  protected isPatientInvalid(): boolean {
    return this.showValidationErrors && !this.selectedPatient;
  }

  protected isScheduledDateInvalid(): boolean {
    return this.showValidationErrors && !this.scheduledDate.trim();
  }

  protected isScheduledTimeInvalid(): boolean {
    return this.showValidationErrors && !this.scheduledTime.trim();
  }

  protected isReasonInvalid(): boolean {
    return this.showValidationErrors && !this.reason.trim();
  }

  protected save(): void {
    this.showValidationErrors = true;
    this.submitError = null;

    const payload = this.buildPayload();
    if (!payload) {
      this.cdr.markForCheck();
      return;
    }

    this.clearPatientSearchTimer();
    void this.submitCreate(payload);
  }

  private selectPatient(option: AppointmentPatientSearchItemApiResponse): void {
    this.selectedPatient = option;
    this.patientSearch = this.buildPatientLabel(option);
  }

  private schedulePatientSearch(): void {
    this.clearPatientSearchTimer();
    this.patientSearchTimer = setTimeout(() => {
      void this.loadPatients(this.patientSearch);
    }, 300);
  }

  private clearPatientSearchTimer(): void {
    if (this.patientSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.patientSearchTimer);
    this.patientSearchTimer = undefined;
  }

  private async loadPatients(search: string): Promise<void> {
    const requestToken = ++this.patientRequestVersion;
    this.isPatientsLoading = true;
    this.patients = [];
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.appointmentsApi.searchPatientsSummary({
          search: search.trim() || undefined,
          limit: this.patientSearchLimit,
        }),
      );

      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.patients = response;
      if (this.selectedPatient) {
        this.selectedPatient =
          response.find((item) => item.patientId === this.selectedPatient?.patientId) ??
          this.selectedPatient;
      }
    } catch {
      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.patients = [];
    } finally {
      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.isPatientsLoading = false;
      this.cdr.markForCheck();
    }
  }

  private buildPayload(): CreateAppointmentRequest | null {
    if (
      !this.selectedPatient ||
      !this.scheduledDate.trim() ||
      !this.scheduledTime.trim() ||
      !this.reason.trim()
    ) {
      return null;
    }

    return {
      patientId: this.selectedPatient.patientId,
      scheduledDate: this.scheduledDate.trim(),
      scheduledTime: this.scheduledTime.trim(),
      reason: this.reason.trim(),
      notes: this.notes.trim() || null,
    };
  }

  private async submitCreate(payload: CreateAppointmentRequest): Promise<void> {
    const selectedPatient = this.selectedPatient;

    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.create(payload));
      if (selectedPatient) {
        this.appointmentsApi.registerLocalCreatedAppointment(payload, selectedPatient);
      }
      this.saved.emit();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear el turno. Intenta nuevamente.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private getCurrentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}
