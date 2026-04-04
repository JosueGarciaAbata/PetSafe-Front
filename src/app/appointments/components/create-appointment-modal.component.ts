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
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { MetadataStore } from '@app/core/metadata/metadata-store.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { AppointmentsApiService } from '../api/appointments-api.service';
import { CreateAppointmentRequest } from '../models/appointment-create.model';
import {
  AppointmentReason,
  APPOINTMENT_REASON_VALUES,
  buildAppointmentReasonLabel,
} from '../models/appointment.model';
import { AppointmentPatientSearchItemApiResponse } from '../models/appointment-patient-search.model';
import { getTodayDateKey } from '../utils/appointment-date.util';

interface AppointmentReasonOption {
  value: AppointmentReason;
  label: string;
}

function addMinutes(time: string, minutes: number): string {
  const [hoursStr, minsStr] = time.split(':');
  const totalMinutes = parseInt(hoursStr, 10) * 60 + parseInt(minsStr, 10) + minutes;
  const clamped = Math.min(totalMinutes, 23 * 60 + 59);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ShellIconComponent,
  ],
  templateUrl: './create-appointment-modal.component.html',
  styleUrl: './create-appointment-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAppointmentModalComponent implements OnDestroy {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly metadataStore = inject(MetadataStore);
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
  protected readonly endTimeErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isEndTimeInvalid(),
  );
  protected readonly reasonErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isReasonInvalid(),
  );

  protected patientSearch = '';
  protected scheduledDate = getTodayDateKey();
  protected scheduledTime = this.getCurrentTime();
  protected endTime = addMinutes(this.scheduledTime, 30);
  protected reason: AppointmentReason | '' = '';
  protected notes = '';
  protected readonly reasonOptions = this.buildReasonOptions();

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

  protected isEndTimeInvalid(): boolean {
    if (!this.showValidationErrors) {
      return false;
    }

    return !this.endTime.trim() || !this.isTimeRangeValid(this.scheduledTime, this.endTime);
  }

  protected isReasonInvalid(): boolean {
    return this.showValidationErrors && !this.reason;
  }

  protected buildEndTimeErrorMessage(): string {
    if (!this.endTime.trim()) {
      return 'Selecciona una hora fin.';
    }

    return 'La hora fin debe ser mayor que la hora inicio.';
  }

  protected onScheduledTimeChanged(value: string): void {
    const previousSuggestedEndTime = addMinutes(this.scheduledTime, 30);
    this.scheduledTime = value;
    this.submitError = null;

    if (!this.endTime.trim() || this.endTime === previousSuggestedEndTime) {
      this.endTime = addMinutes(value, 30);
      return;
    }

    if (!this.isTimeRangeValid(this.scheduledTime, this.endTime)) {
      this.endTime = addMinutes(value, 30);
    }
  }

  protected onEndTimeChanged(value: string): void {
    this.endTime = value;
    this.submitError = null;
  }

  protected openDatePicker(input: HTMLInputElement): void {
    this.submitError = null;

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
      !this.endTime.trim() ||
      !this.isTimeRangeValid(this.scheduledTime, this.endTime) ||
      !this.reason
    ) {
      return null;
    }

    return {
      patientId: this.selectedPatient.patientId,
      scheduledDate: this.scheduledDate.trim(),
      scheduledTime: this.scheduledTime.trim(),
      endTime: this.endTime.trim(),
      reason: this.reason,
      notes: this.notes.trim() || null,
    };
  }

  private buildReasonOptions(): AppointmentReasonOption[] {
    const metadataValues = this.metadataStore.getEnumValues('AppointmentReasonEnum');
    const enumValues = metadataValues.filter(this.isAppointmentReason);
    const values = enumValues.length > 0 ? enumValues : [...APPOINTMENT_REASON_VALUES];

    return values.map((value) => ({
      value,
      label: buildAppointmentReasonLabel(value),
    }));
  }

  private isAppointmentReason(value: string): value is AppointmentReason {
    return APPOINTMENT_REASON_VALUES.includes(value as AppointmentReason);
  }

  private isTimeRangeValid(startTime: string, endTime: string): boolean {
    return Boolean(startTime.trim()) && Boolean(endTime.trim()) && endTime > startTime;
  }

  private async submitCreate(payload: CreateAppointmentRequest): Promise<void> {
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.create(payload));
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
