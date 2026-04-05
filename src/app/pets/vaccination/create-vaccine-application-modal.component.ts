import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
  FormControl,
  FormBuilder,
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
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { VeterinarianSummaryApiResponse } from '@app/core/users/users.model';
import {
  CreatePatientVaccineApplicationRequest,
  VaccineCatalogItem,
} from './models/patient-vaccination-plan.model';

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-create-vaccine-application-modal',
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
  templateUrl: './create-vaccine-application-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateVaccineApplicationModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly today = new Date().toISOString().slice(0, 10);
  private isSelectingProduct = false;
  private isSelectingDoctor = false;
  private lastInternalDoctor: VeterinarianSummaryApiResponse | null = null;

  @Input() open = false;
  @Input() patientName = 'Paciente';
  @Input() quickContextLabel: string | null = null;
  @Input() doctorOptions: VeterinarianSummaryApiResponse[] = [];
  @Input() initialDoctorSelection: VeterinarianSummaryApiResponse | null = null;
  @Input() canSelectDoctor = false;
  @Input() products: VaccineCatalogItem[] = [];
  @Input() initialProductSelection: VaccineCatalogItem | null = null;
  @Input() initialApplicationDate: string | null = null;
  @Input() initialNextDoseDate: string | null = null;
  @Input() isLoadingProducts = false;
  @Input() isLoadingDoctors = false;
  @Input() loadError: string | null = null;
  @Input() doctorLoadError: string | null = null;
  @Input() submitError: string | null = null;
  @Input() isSaving = false;
  @Input() title = 'Registrar aplicación de vacuna';
  @Input() description = 'Registra la vacuna aplicada al paciente.';
  @Input() submitLabel = 'Registrar vacuna';
  @Input() showDoctorField = true;
  @Input() showExternalToggle = true;
  @Input() showAdministeredAtField = true;
  @Input() showBatchNumberField = true;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<CreatePatientVaccineApplicationRequest>();
  @Output() readonly doctorSearchRequested = new EventEmitter<string>();

  protected showValidationErrors = false;
  protected vaccineSearch = '';
  protected doctorSearch = '';
  protected selectedProduct: VaccineCatalogItem | null = null;
  protected selectedDoctor: VeterinarianSummaryApiResponse | null = null;
  protected readonly vaccineErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasVaccineSelectionError(),
  );
  protected readonly doctorErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasDoctorSelectionError(),
  );
  protected readonly form = this.fb.group({
    vaccineId: this.fb.control<number | null>(null, [Validators.required]),
    applicationDate: this.fb.nonNullable.control(this.today, [Validators.required]),
    administeredByEmployeeId: this.fb.control<number | null>(null),
    administeredAt: this.fb.nonNullable.control('', [Validators.maxLength(180)]),
    isExternal: this.fb.nonNullable.control(false),
    batchNumber: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
    nextDoseDate: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true && changes['open']?.previousValue !== true) {
      this.resetForm();
      return;
    }

    if ((changes['initialDoctorSelection'] || changes['canSelectDoctor']) && this.open) {
      if (!this.requiresDoctorSelection()) {
        this.syncDoctorSelection(null);
      } else if (!this.selectedDoctor && !this.doctorSearch.trim()) {
        this.syncDoctorSelection(this.initialDoctorSelection);
      }
    }

    if (changes['doctorOptions'] && this.open) {
      this.syncDoctorSelectionAgainstOptions();
    }

    if (changes['initialProductSelection'] && this.open) {
      this.syncProductSelection(this.initialProductSelection);
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.close();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected submit(): void {
    this.showValidationErrors = true;
    this.form.markAllAsTouched();

    if (
      this.form.invalid
      || !this.selectedProduct
      || this.requiresDoctorSelection() && !this.selectedDoctor
      || this.nextDoseDateInvalid()
      || this.isLoadingProducts
      || this.products.length === 0
    ) {
      return;
    }

    const value = this.form.getRawValue();
    const payload: CreatePatientVaccineApplicationRequest = {
      vaccineId: this.selectedProduct.id,
      applicationDate: value.applicationDate,
      isExternal: this.showExternalToggle ? value.isExternal : false,
    };

    const administeredAt = value.administeredAt.trim();
    const batchNumber = value.batchNumber.trim();
    const nextDoseDate = value.nextDoseDate.trim();
    const notes = value.notes.trim();

    if (this.showDoctorField && !value.isExternal && this.selectedDoctor) {
      payload.administeredByEmployeeId = this.selectedDoctor.id;
    }

    if (this.showAdministeredAtField && administeredAt) {
      payload.administeredAt = administeredAt;
    }

    if (this.showBatchNumberField && batchNumber) {
      payload.batchNumber = batchNumber;
    }

    if (nextDoseDate) {
      payload.nextDoseDate = nextDoseDate;
    }

    if (notes) {
      payload.notes = notes;
    }

    this.submitted.emit(payload);
  }

  protected hasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || this.showValidationErrors);
  }

  protected onVaccineChanged(value: string): void {
    this.vaccineSearch = value;

    if (this.isSelectingProduct) {
      this.isSelectingProduct = false;
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const matched = this.products.find((item) =>
      this.buildProductLabel(item).trim().toLowerCase() === normalizedValue,
    ) ?? null;

    this.selectedProduct = matched;
    this.form.controls.vaccineId.setValue(matched?.id ?? null);
  }

  protected onProductOptionSelection(
    isUserInput: boolean,
    option: VaccineCatalogItem,
  ): void {
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
      return this.products;
    }

    return this.products.filter((item) =>
      this.buildProductLabel(item).toLowerCase().includes(normalizedSearch),
    );
  }

  protected buildProductLabel(product: VaccineCatalogItem): string {
    return product.name.trim();
  }

  protected buildProductMeta(product: VaccineCatalogItem): string {
    const speciesName = product.species?.name?.trim() || 'Sin especie';
    return product.isRevaccination
      ? `${speciesName} · Revacunación`
      : speciesName;
  }

  protected hasVaccineSelectionError(): boolean {
    return this.showValidationErrors && !this.selectedProduct;
  }

  protected hasDoctorSelectionError(): boolean {
    return this.showValidationErrors && this.requiresDoctorSelection() && !this.selectedDoctor;
  }

  protected nextDoseDateInvalid(): boolean {
    const applicationDate = this.form.controls.applicationDate.getRawValue().trim();
    const nextDoseDate = this.form.controls.nextDoseDate.getRawValue().trim();

    return !!applicationDate && !!nextDoseDate && nextDoseDate <= applicationDate;
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
    const matched = this.doctorOptions.find((item) =>
      this.buildDoctorLabel(item).trim().toLowerCase() === normalizedValue,
    ) ?? null;

    this.syncDoctorSelection(matched);

    if (this.canSelectDoctor) {
      this.doctorSearchRequested.emit(value);
    }
  }

  protected onDoctorFocus(): void {
    if (!this.canSelectDoctor || !this.requiresDoctorSelection()) {
      return;
    }

    this.doctorSearchRequested.emit(this.doctorSearch);
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
    if (!this.showExternalToggle) {
      this.form.controls.isExternal.setValue(false);
      return;
    }

    const isExternal = this.form.controls.isExternal.getRawValue();

    if (isExternal) {
      this.lastInternalDoctor = this.selectedDoctor;
      this.syncDoctorSelection(null);
      return;
    }

    this.syncDoctorSelection(
      this.lastInternalDoctor
      ?? this.selectedDoctor
      ?? this.initialDoctorSelection
      ?? null,
    );
  }

  protected filteredDoctorOptions(): VeterinarianSummaryApiResponse[] {
    const normalizedSearch = this.doctorSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.doctorOptions;
    }

    return this.doctorOptions.filter((item) => {
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

    return parts.length > 0 ? parts.join(' · ') : 'Veterinario';
  }

  protected selectedDoctorMeta(): string | null {
    return this.selectedDoctor ? this.buildDoctorMeta(this.selectedDoctor) : null;
  }

  protected requiresDoctorSelection(): boolean {
    return this.showDoctorField && !this.form.controls.isExternal.getRawValue();
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

  private resetForm(): void {
    this.showValidationErrors = false;
    this.selectedProduct = null;
    this.selectedDoctor = null;
    this.lastInternalDoctor = this.initialDoctorSelection;
    this.vaccineSearch = '';
    this.doctorSearch = '';
    this.form.reset({
      vaccineId: null,
      applicationDate: this.initialApplicationDate?.trim() || this.today,
      administeredByEmployeeId: null,
      administeredAt: '',
      isExternal: this.showExternalToggle ? false : false,
      batchNumber: '',
      nextDoseDate: this.initialNextDoseDate?.trim() || '',
      notes: '',
    });

    if (!this.showExternalToggle) {
      this.form.controls.isExternal.setValue(false);
    }

    this.syncDoctorSelection(this.initialDoctorSelection);
    this.syncProductSelection(this.initialProductSelection);
  }

  private syncDoctorSelection(doctor: VeterinarianSummaryApiResponse | null): void {
    this.selectedDoctor = doctor;
    this.doctorSearch = doctor ? this.buildDoctorLabel(doctor) : '';
    this.form.controls.administeredByEmployeeId.setValue(doctor?.id ?? null);

    if (doctor) {
      this.lastInternalDoctor = doctor;
    }
  }

  private syncDoctorSelectionAgainstOptions(): void {
    if (this.selectedDoctor) {
      const matchedSelectedDoctor =
        this.doctorOptions.find((item) => item.id === this.selectedDoctor?.id) ?? null;

      if (matchedSelectedDoctor) {
        this.syncDoctorSelection(matchedSelectedDoctor);
      } else if (!this.doctorSearch.trim().length) {
        this.syncDoctorSelection(null);
      }
    }
  }

  private syncProductSelection(product: VaccineCatalogItem | null): void {
    this.selectedProduct = product;
    this.vaccineSearch = product ? this.buildProductLabel(product) : '';
    this.form.controls.vaccineId.setValue(product?.id ?? null);
  }
}
