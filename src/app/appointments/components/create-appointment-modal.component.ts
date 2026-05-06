import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  OnChanges,
  SimpleChanges,
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
import { AppToastService } from '@app/core/ui/app-toast.service';
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
export class CreateAppointmentModalComponent implements OnInit, OnChanges, OnDestroy {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly metadataStore = inject(MetadataStore);
  private readonly toast = inject(AppToastService);
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

  @Input() title = 'Nuevo turno';
  @Input() description = 'Registra una nueva cita programada.';
  @Input() submitLabel = 'Guardar turno';
  @Input() emitOnly = false;
  @Input() lockPatient = false;
  @Input() presetPatientId: number | null = null;
  @Input() presetPatientLabel = '';
  @Input() lockReason = false;
  @Input() presetReason: AppointmentReason | '' = '';
  @Input() initialScheduledDate: string | null = null;
  @Input() initialScheduledTime: string | null = null;
  @Input() initialEndTime: string | null = null;
  @Input() initialNotes: string | null = null;
  @Input() externalSubmitting = false;
  @Input() externalError: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<CreateAppointmentRequest>();

  ngOnInit(): void {
    this.applyInputState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const relevantKeys = [
      'lockPatient',
      'presetPatientId',
      'presetPatientLabel',
      'lockReason',
      'presetReason',
      'initialScheduledDate',
      'initialScheduledTime',
      'initialEndTime',
      'initialNotes',
    ];

    if (relevantKeys.some((key) => key in changes)) {
      this.applyInputState();
    }
  }

  ngOnDestroy(): void {
    this.clearPatientSearchTimer();
  }

  protected close(): void {
    if (this.isBusy()) {
      return;
    }

    this.clearPatientSearchTimer();
    this.closed.emit();
  }

  protected patientOptions(): AppointmentPatientSearchItemApiResponse[] {
    return this.patients;
  }

  protected shouldShowPatientSelector(): boolean {
    return !this.lockPatient;
  }

  protected shouldShowReasonSelector(): boolean {
    return !this.lockReason;
  }

  protected lockedReasonLabel(): string {
    return buildAppointmentReasonLabel(this.presetReason);
  }

  protected onPatientChanged(value: string): void {
    if (this.lockPatient) {
      return;
    }

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
    return this.showValidationErrors && !this.resolveSelectedPatientId();
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
    return this.showValidationErrors && !this.resolveSelectedReason();
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
      this.toast.info('Revisa los campos obligatorios del turno.');
      this.cdr.markForCheck();
      return;
    }

    this.clearPatientSearchTimer();
    if (this.emitOnly) {
      this.submitted.emit(payload);
      this.cdr.markForCheck();
      return;
    }

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
    const patientId = this.resolveSelectedPatientId();
    const reason = this.resolveSelectedReason();

    if (
      !patientId ||
      !this.scheduledDate.trim() ||
      !this.scheduledTime.trim() ||
      !this.endTime.trim() ||
      !this.isTimeRangeValid(this.scheduledTime, this.endTime) ||
      !reason
    ) {
      return null;
    }

    return {
      patientId,
      scheduledDate: this.scheduledDate.trim(),
      scheduledTime: this.scheduledTime.trim(),
      endTime: this.endTime.trim(),
      reason,
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
      this.toast.error(this.submitError);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private getCurrentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private applyInputState(): void {
    if (this.initialScheduledDate?.trim()) {
      this.scheduledDate = this.initialScheduledDate.trim();
    }

    if (this.initialScheduledTime?.trim()) {
      this.scheduledTime = this.initialScheduledTime.trim();
    }

    if (this.initialEndTime?.trim()) {
      this.endTime = this.initialEndTime.trim();
    } else if (this.initialScheduledTime?.trim()) {
      this.endTime = addMinutes(this.initialScheduledTime.trim(), 30);
    }

    if (this.initialNotes !== null && this.initialNotes !== undefined) {
      this.notes = this.initialNotes;
    }

    if (this.lockPatient && this.presetPatientId) {
      this.selectedPatient = {
        patientId: this.presetPatientId,
        patientName: this.presetPatientLabel,
        tutorId: 0,
        tutorName: '',
        documentId: null,
      };
      this.patientSearch = this.presetPatientLabel;
      this.patients = [];
      this.isPatientsLoading = false;
      this.clearPatientSearchTimer();
    }

    if (this.lockReason && this.presetReason) {
      this.reason = this.presetReason;
    }

    this.cdr.markForCheck();
  }

  private resolveSelectedPatientId(): number | null {
    if (this.lockPatient && this.presetPatientId) {
      return this.presetPatientId;
    }

    return this.selectedPatient?.patientId ?? null;
  }

  private resolveSelectedReason(): AppointmentReason | '' {
    if (this.lockReason && this.presetReason) {
      return this.presetReason;
    }

    return this.reason;
  }

  private isBusy(): boolean {
    return this.isSaving || this.externalSubmitting;
  }
}
