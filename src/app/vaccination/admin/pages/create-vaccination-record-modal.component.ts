import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroupDirective,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppointmentsApiService } from '@app/appointments/api/appointments-api.service';
import { AppointmentPatientSearchItemApiResponse } from '@app/appointments/models/appointment-patient-search.model';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { UsersApiService } from '@app/core/users/users-api.service';
import { UserProfileApiResponse, VeterinarianSummaryApiResponse } from '@app/core/users/users.model';
import { PetBasicDetailApiResponse } from '@app/pets/models/pet-detail.model';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import {
  CreatePatientVaccineApplicationRequest,
  PatientVaccineRecord,
  VaccineCatalogItem,
} from '@app/pets/vaccination/models/patient-vaccination-plan.model';
import { PatientVaccinationApiService } from '@app/pets/vaccination/services/patient-vaccination-api.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { firstValueFrom } from 'rxjs';

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-create-vaccination-record-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ShellIconComponent,
  ],
  templateUrl: './create-vaccination-record-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateVaccinationRecordModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly vaccinationApi = inject(PatientVaccinationApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly todayDateKey = new Date().toISOString().slice(0, 10);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  private patientRequestVersion = 0;
  private productsRequestVersion = 0;
  private doctorsRequestVersion = 0;
  private isSelectingPatient = false;
  private isSelectingProduct = false;
  private isSelectingDoctor = false;
  private lastInternalDoctor: VeterinarianSummaryApiResponse | null = null;

  @Input() open = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<PatientVaccineRecord>();

  protected showValidationErrors = false;
  protected isSaving = false;

  protected patientSearch = '';
  protected selectedPatient: AppointmentPatientSearchItemApiResponse | null = null;
  protected patientOptions: AppointmentPatientSearchItemApiResponse[] = [];
  protected isLoadingPatients = false;
  protected patientLoadError: string | null = null;
  protected selectedPetDetail: PetBasicDetailApiResponse | null = null;

  protected vaccineSearch = '';
  protected selectedProduct: VaccineCatalogItem | null = null;
  protected vaccineProducts: VaccineCatalogItem[] = [];
  protected isLoadingProducts = false;
  protected productsLoadError: string | null = null;

  protected doctorSearch = '';
  protected selectedDoctor: VeterinarianSummaryApiResponse | null = null;
  protected veterinarianOptions: VeterinarianSummaryApiResponse[] = [];
  protected isLoadingDoctors = false;
  protected doctorsLoadError: string | null = null;
  protected currentUserProfile: UserProfileApiResponse | null = null;
  protected initialDoctorSelection: VeterinarianSummaryApiResponse | null = null;

  protected readonly patientErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasPatientSelectionError(),
  );
  protected readonly vaccineErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasVaccineSelectionError(),
  );
  protected readonly doctorErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasDoctorSelectionError(),
  );

  protected readonly form = this.fb.group({
    patientId: this.fb.control<number | null>(null, [Validators.required]),
    vaccineId: this.fb.control<number | null>(null, [Validators.required]),
    applicationDate: this.fb.nonNullable.control(this.todayDateKey, [Validators.required]),
    administeredByEmployeeId: this.fb.control<number | null>(null),
    administeredAt: this.fb.nonNullable.control('', [Validators.maxLength(180)]),
    isExternal: this.fb.nonNullable.control(false),
    batchNumber: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
    nextDoseDate: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true && changes['open']?.previousValue !== true) {
      this.resetState();
      void this.loadCurrentUserProfile();
      return;
    }

    if (changes['open']?.currentValue === false && changes['open']?.previousValue === true) {
      this.clearPatientSearchTimer();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.close();
    }
  }

  protected close(): void {
    if (!this.isSaving) {
      this.closed.emit();
    }
  }

  protected get today(): string {
    return this.todayDateKey;
  }

  protected onPatientChanged(value: string): void {
    this.patientSearch = value;

    if (this.isSelectingPatient) {
      this.isSelectingPatient = false;
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const matched = this.patientOptions.find((item) =>
      this.buildPatientLabel(item).trim().toLowerCase() === normalizedValue,
    ) ?? null;

    if (matched) {
      void this.selectPatient(matched);
      return;
    }

    this.clearSelectedPatient();
    this.schedulePatientSearch(value);
  }

  protected onPatientFocus(): void {
    this.schedulePatientSearch(this.patientSearch);
  }

  protected onPatientOptionSelection(
    isUserInput: boolean,
    option: AppointmentPatientSearchItemApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingPatient = true;
    void this.selectPatient(option);
  }

  protected patientOptionsFiltered(): AppointmentPatientSearchItemApiResponse[] {
    const normalizedSearch = this.patientSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.patientOptions;
    }

    return this.patientOptions.filter((item) => {
      const haystack = [item.patientName, item.tutorName, item.documentId ?? ''].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }

  protected onVaccineChanged(value: string): void {
    this.vaccineSearch = value;

    if (this.isSelectingProduct) {
      this.isSelectingProduct = false;
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const matched = this.vaccineProducts.find((item) =>
      this.buildProductLabel(item).trim().toLowerCase() === normalizedValue,
    ) ?? null;

    this.selectedProduct = matched;
    this.form.controls.vaccineId.setValue(matched?.id ?? null);
  }

  protected onProductOptionSelection(isUserInput: boolean, option: VaccineCatalogItem): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingProduct = true;
    this.selectedProduct = option;
    this.vaccineSearch = this.buildProductLabel(option);
    this.form.controls.vaccineId.setValue(option.id);
  }

  protected productOptions(): VaccineCatalogItem[] {
    const normalizedSearch = this.vaccineSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.vaccineProducts;
    }

    return this.vaccineProducts.filter((item) =>
      this.buildProductLabel(item).toLowerCase().includes(normalizedSearch),
    );
  }

  protected onDoctorChanged(value: string): void {
    if (!this.requiresDoctorSelection()) {
      return;
    }

    this.doctorSearch = value;

    if (this.isSelectingDoctor) {
      this.isSelectingDoctor = false;
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const matched = this.veterinarianOptions.find((item) =>
      this.buildDoctorLabel(item).trim().toLowerCase() === normalizedValue,
    ) ?? null;

    this.syncDoctorSelection(matched);

    if (this.canSelectDoctor()) {
      void this.loadVeterinarians(value);
    }
  }

  protected onDoctorFocus(): void {
    if (this.canSelectDoctor() && this.requiresDoctorSelection()) {
      void this.loadVeterinarians(this.doctorSearch);
    }
  }

  protected onDoctorOptionSelection(
    isUserInput: boolean,
    option: VeterinarianSummaryApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingDoctor = true;
    this.syncDoctorSelection(option);
  }

  protected onExternalChanged(): void {
    const isExternal = this.form.controls.isExternal.getRawValue();

    if (isExternal) {
      this.lastInternalDoctor = this.selectedDoctor;
      this.syncDoctorSelection(null);
      return;
    }

    this.syncDoctorSelection(
      this.lastInternalDoctor ?? this.selectedDoctor ?? this.initialDoctorSelection ?? null,
    );
  }

  protected async submit(): Promise<void> {
    this.showValidationErrors = true;
    this.form.markAllAsTouched();

    if (
      this.form.invalid
      || !this.selectedPatient
      || !this.selectedProduct
      || this.applicationDateInvalid()
      || this.nextDoseDateInvalid()
      || this.requiresDoctorSelection() && !this.selectedDoctor
      || this.isLoadingProducts
      || this.vaccineProducts.length === 0
    ) {
      return;
    }

    const value = this.form.getRawValue();
    const payload: CreatePatientVaccineApplicationRequest = {
      vaccineId: this.selectedProduct.id,
      applicationDate: value.applicationDate,
      isExternal: value.isExternal,
    };

    const administeredAt = value.administeredAt.trim();
    const batchNumber = value.batchNumber.trim();
    const nextDoseDate = value.nextDoseDate.trim();
    const notes = value.notes.trim();

    if (!value.isExternal && this.selectedDoctor) {
      payload.administeredByEmployeeId = this.selectedDoctor.id;
    }

    if (administeredAt) {
      payload.administeredAt = administeredAt;
    }

    if (batchNumber) {
      payload.batchNumber = batchNumber;
    }

    if (nextDoseDate) {
      payload.nextDoseDate = nextDoseDate;
    }

    if (notes) {
      payload.notes = notes;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      const created = await firstValueFrom(
        this.vaccinationApi.addPatientApplication(this.selectedPatient.patientId, payload),
      );
      this.toast.success(this.buildSuccessMessage(created));
      this.saved.emit(created);
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo registrar la vacunacion.',
        }),
      );
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected hasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || this.showValidationErrors);
  }

  protected hasPatientSelectionError(): boolean {
    return this.showValidationErrors && !this.selectedPatient;
  }

  protected hasVaccineSelectionError(): boolean {
    return this.showValidationErrors && !this.selectedProduct;
  }

  protected hasDoctorSelectionError(): boolean {
    return this.showValidationErrors && this.requiresDoctorSelection() && !this.selectedDoctor;
  }

  protected applicationDateInvalid(): boolean {
    const applicationDate = this.form.controls.applicationDate.getRawValue().trim();
    return !!applicationDate && applicationDate > this.todayDateKey;
  }

  protected nextDoseDateInvalid(): boolean {
    const applicationDate = this.form.controls.applicationDate.getRawValue().trim();
    const nextDoseDate = this.form.controls.nextDoseDate.getRawValue().trim();

    return !!nextDoseDate
      && ((!!applicationDate && nextDoseDate <= applicationDate) || nextDoseDate < this.todayDateKey);
  }

  protected canSelectDoctor(): boolean {
    return this.currentUserProfile?.roles.includes('ADMIN') ?? false;
  }

  protected requiresDoctorSelection(): boolean {
    return !this.form.controls.isExternal.getRawValue();
  }

  protected canSearchVaccines(): boolean {
    return !!this.selectedPatient && !!this.selectedPetDetail?.species?.id && !this.productsLoadError;
  }

  protected selectedPatientMeta(): string | null {
    if (!this.selectedPatient) {
      return null;
    }

    const tutor = this.selectedPatient.tutorName?.trim();
    const documentId = this.selectedPatient.documentId?.trim();
    const species = this.selectedPetDetail?.species?.name?.trim();
    const parts = [tutor ? `Tutor: ${tutor}` : null, documentId ? `CI ${documentId}` : null, species || null]
      .filter((value): value is string => !!value);

    return parts.length > 0 ? parts.join(' | ') : null;
  }

  protected buildPatientLabel(patient: AppointmentPatientSearchItemApiResponse): string {
    return patient.patientName.trim();
  }

  protected buildPatientMeta(patient: AppointmentPatientSearchItemApiResponse): string {
    const parts = [
      patient.tutorName?.trim() ? `Tutor: ${patient.tutorName.trim()}` : null,
      patient.documentId?.trim() ? `CI ${patient.documentId.trim()}` : null,
    ].filter((value): value is string => !!value);

    return parts.length > 0 ? parts.join(' | ') : 'Paciente';
  }

  protected buildProductLabel(product: VaccineCatalogItem): string {
    return product.name.trim();
  }

  protected buildProductMeta(product: VaccineCatalogItem): string {
    const speciesName = product.species?.name?.trim() || 'Sin especie';
    return product.isRevaccination ? `${speciesName} | Revacunacion` : speciesName;
  }

  protected filteredDoctorOptions(): VeterinarianSummaryApiResponse[] {
    const normalizedSearch = this.doctorSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.veterinarianOptions;
    }

    return this.veterinarianOptions.filter((item) => {
      const haystack = [
        item.fullName,
        item.documentId ?? '',
        item.code ?? '',
        item.professionalRegistration ?? '',
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }

  protected buildDoctorLabel(doctor: VeterinarianSummaryApiResponse): string {
    return doctor.fullName.trim();
  }

  protected buildDoctorMeta(doctor: VeterinarianSummaryApiResponse): string {
    const parts = [doctor.code, doctor.documentId ? `CI ${doctor.documentId}` : null]
      .filter((value): value is string => !!value && value.trim().length > 0);

    return parts.length > 0 ? parts.join(' | ') : 'Veterinario';
  }

  protected selectedDoctorMeta(): string | null {
    return this.selectedDoctor ? this.buildDoctorMeta(this.selectedDoctor) : null;
  }

  protected openDatePicker(input: HTMLInputElement): void {
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  private schedulePatientSearch(value: string): void {
    this.clearPatientSearchTimer();
    this.patientSearchTimer = setTimeout(() => {
      void this.loadPatients(value);
    }, 250);
  }

  private clearPatientSearchTimer(): void {
    if (this.patientSearchTimer !== undefined) {
      clearTimeout(this.patientSearchTimer);
      this.patientSearchTimer = undefined;
    }
  }

  private async loadPatients(search: string): Promise<void> {
    const requestToken = ++this.patientRequestVersion;
    this.isLoadingPatients = true;
    this.patientLoadError = null;
    this.cdr.detectChanges();

    try {
      const patients = await firstValueFrom(
        this.appointmentsApi.searchPatientsSummary({
          search: search.trim() || undefined,
          limit: 8,
        }),
      );

      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.patientOptions = patients;
    } catch (error: unknown) {
      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.patientLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo buscar pacientes.',
      });
    } finally {
      if (requestToken !== this.patientRequestVersion) {
        return;
      }

      this.isLoadingPatients = false;
      this.cdr.detectChanges();
    }
  }

  private async selectPatient(patient: AppointmentPatientSearchItemApiResponse): Promise<void> {
    this.selectedPatient = patient;
    this.patientSearch = this.buildPatientLabel(patient);
    this.form.controls.patientId.setValue(patient.patientId);
    this.patientLoadError = null;
    this.clearVaccineSelection();
    this.selectedPetDetail = null;
    this.isLoadingProducts = true;
    this.productsLoadError = null;
    this.cdr.detectChanges();

    try {
      const pet = await firstValueFrom(this.petsApi.getBasicById(patient.patientId));
      this.selectedPetDetail = pet;

      const speciesId = pet.species?.id ?? null;
      if (!speciesId) {
        this.vaccineProducts = [];
        this.productsLoadError = 'La mascota no tiene especie configurada.';
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
        return;
      }

      await this.loadProducts(speciesId);
    } catch (error: unknown) {
      this.selectedPetDetail = null;
      this.vaccineProducts = [];
      this.productsLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la mascota seleccionada.',
      });
      this.isLoadingProducts = false;
      this.cdr.detectChanges();
    }
  }

  private clearSelectedPatient(): void {
    this.selectedPatient = null;
    this.selectedPetDetail = null;
    this.form.controls.patientId.setValue(null);
    this.clearVaccineSelection();
    this.vaccineProducts = [];
    this.productsLoadError = null;
  }

  private clearVaccineSelection(): void {
    this.selectedProduct = null;
    this.vaccineSearch = '';
    this.form.controls.vaccineId.setValue(null);
  }

  private async loadProducts(speciesId: number): Promise<void> {
    const requestToken = ++this.productsRequestVersion;
    this.isLoadingProducts = true;
    this.productsLoadError = null;
    this.cdr.detectChanges();

    try {
      const products = await firstValueFrom(this.vaccinationApi.listProducts({ speciesId }));

      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.vaccineProducts = products.filter((item) => item.isActive);
    } catch (error: unknown) {
      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.vaccineProducts = [];
      this.productsLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el catalogo de vacunas.',
      });
    } finally {
      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.isLoadingProducts = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCurrentUserProfile(): Promise<void> {
    try {
      this.currentUserProfile = await firstValueFrom(this.usersApi.getMe());
      this.initialDoctorSelection = this.buildCurrentVeterinarianSummary();
      this.syncDoctorSelection(this.initialDoctorSelection);

      if (this.canSelectDoctor()) {
        void this.loadVeterinarians();
      } else if (!this.initialDoctorSelection) {
        this.doctorsLoadError = 'Tu usuario no tiene un veterinario asociado.';
      }
    } catch {
      this.currentUserProfile = null;
      this.initialDoctorSelection = null;
      this.syncDoctorSelection(null);
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async loadVeterinarians(search?: string): Promise<void> {
    const requestToken = ++this.doctorsRequestVersion;
    this.isLoadingDoctors = true;
    this.doctorsLoadError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.usersApi.listVeterinarians(search));

      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      const merged = new Map<number, VeterinarianSummaryApiResponse>();

      for (const veterinarian of response) {
        merged.set(veterinarian.id, veterinarian);
      }

      const currentVeterinarian = this.buildCurrentVeterinarianSummary();
      if (currentVeterinarian) {
        merged.set(currentVeterinarian.id, currentVeterinarian);
      }

      this.veterinarianOptions = Array.from(merged.values()).sort((left, right) =>
        left.fullName.localeCompare(right.fullName),
      );

      if (this.initialDoctorSelection) {
        const matched = this.veterinarianOptions.find((item) => item.id === this.initialDoctorSelection?.id) ?? null;
        if (matched) {
          this.initialDoctorSelection = matched;
          if (!this.selectedDoctor) {
            this.syncDoctorSelection(matched);
          }
        }
      }
    } catch (error: unknown) {
      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      this.doctorsLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la lista de veterinarios.',
      });
    } finally {
      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      this.isLoadingDoctors = false;
      this.cdr.detectChanges();
    }
  }

  private syncDoctorSelection(doctor: VeterinarianSummaryApiResponse | null): void {
    this.selectedDoctor = doctor;
    this.doctorSearch = doctor ? this.buildDoctorLabel(doctor) : '';
    this.form.controls.administeredByEmployeeId.setValue(doctor?.id ?? null);

    if (doctor) {
      this.lastInternalDoctor = doctor;
    }
  }

  private buildCurrentVeterinarianSummary(): VeterinarianSummaryApiResponse | null {
    if (!this.currentUserProfile?.isVeterinarian || !this.currentUserProfile.employeeId) {
      return null;
    }

    const firstName = this.currentUserProfile.person?.firstName?.trim() ?? '';
    const lastName = this.currentUserProfile.person?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      id: this.currentUserProfile.employeeId,
      personId: this.currentUserProfile.person?.id ?? 0,
      fullName: fullName || this.currentUserProfile.email,
      documentId: null,
      code: null,
      professionalRegistration: null,
    };
  }

  private buildSuccessMessage(record: PatientVaccineRecord): string {
    const patientName = this.selectedPatient?.patientName?.trim();
    const vaccineName = record.vaccineName?.trim();

    if (patientName && vaccineName) {
      return `Vacunacion registrada para ${patientName}: ${vaccineName}.`;
    }

    return 'Vacunacion registrada correctamente.';
  }

  private resetState(): void {
    this.showValidationErrors = false;
    this.isSaving = false;
    this.patientOptions = [];
    this.patientSearch = '';
    this.selectedPatient = null;
    this.patientLoadError = null;
    this.selectedPetDetail = null;
    this.vaccineProducts = [];
    this.vaccineSearch = '';
    this.selectedProduct = null;
    this.productsLoadError = null;
    this.isLoadingPatients = false;
    this.isLoadingProducts = false;
    this.isLoadingDoctors = false;
    this.doctorsLoadError = null;
    this.veterinarianOptions = [];
    this.currentUserProfile = null;
    this.initialDoctorSelection = null;
    this.selectedDoctor = null;
    this.doctorSearch = '';
    this.lastInternalDoctor = null;
    this.form.reset({
      patientId: null,
      vaccineId: null,
      applicationDate: this.todayDateKey,
      administeredByEmployeeId: null,
      administeredAt: '',
      isExternal: false,
      batchNumber: '',
      nextDoseDate: '',
      notes: '',
    });
    this.clearPatientSearchTimer();
    this.cdr.detectChanges();
  }
}
