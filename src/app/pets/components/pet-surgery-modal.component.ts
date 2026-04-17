import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CatalogAdminItem } from '@app/catalogs/admin/models/catalog-admin.model';
import { PET_TEXTAREA_MAX_LENGTH } from '../models/pet-form-validation.util';
import {
  PetSurgeryApiResponse,
  PetSurgeryStatus,
  UpsertPetSurgeryRequest,
} from '../models/pet-surgery.model';

type SurgeryStatusOption = {
  value: PetSurgeryStatus;
  label: string;
};

@Component({
  selector: 'app-pet-surgery-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './pet-surgery-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetSurgeryModalComponent implements OnChanges {
  @Input() open = false;
  @Input() patientName = 'Mascota';
  @Input() catalog: CatalogAdminItem[] = [];
  @Input() isCatalogLoading = false;
  @Input() initialSurgery: PetSurgeryApiResponse | null = null;
  @Input() isSaving = false;
  @Input() submitError: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<UpsertPetSurgeryRequest>();

  protected readonly textAreaMaxLength = PET_TEXTAREA_MAX_LENGTH;
  protected readonly surgeryStatusOptions: SurgeryStatusOption[] = [
    { value: 'PROGRAMADA', label: 'Programada' },
    { value: 'EN_CURSO', label: 'En curso' },
    { value: 'FINALIZADA', label: 'Finalizada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

  protected surgeryTypeValue = '';
  protected selectedCatalogId: number | null = null;
  protected surgeryStatus: PetSurgeryStatus = 'FINALIZADA';
  protected scheduledDate = '';
  protected performedDate = '';
  protected description = '';
  protected postoperativeInstructions = '';
  protected formError: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['initialSurgery']) {
      this.hydrateForm();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected save(): void {
    const normalizedType = this.surgeryTypeValue.trim();
    const selectedCatalog =
      (this.selectedCatalogId !== null
        ? this.catalog.find((item) => item.id === this.selectedCatalogId) ?? null
        : null);

    if (!selectedCatalog && !normalizedType) {
      this.formError = 'Selecciona una cirugía del catálogo o escribe el nombre manual.';
      return;
    }

    if (this.isDateRangeInvalid()) {
      this.formError = 'La fecha de realización no puede ser anterior a la fecha programada.';
      return;
    }

    if (this.isPerformedDateInFuture()) {
      this.formError = 'La fecha de realización no puede ser futura.';
      return;
    }

    if (this.isDescriptionTooLong() || this.isPostoperativeInstructionsTooLong()) {
      this.formError = 'Revisa la longitud de la descripción y del postoperatorio.';
      return;
    }

    this.submitted.emit({
      id: this.initialSurgery?.id,
      catalogId: selectedCatalog?.id ?? undefined,
      surgeryType: selectedCatalog?.name ?? normalizedType,
      scheduledDate: this.normalizeDateField(this.scheduledDate) ?? undefined,
      performedDate: this.normalizeDateField(this.performedDate) ?? undefined,
      surgeryStatus: this.surgeryStatus,
      description: this.normalizeText(this.description) ?? undefined,
      postoperativeInstructions: this.normalizeText(this.postoperativeInstructions) ?? undefined,
    });
  }

  protected filteredCatalog(): CatalogAdminItem[] {
    const search = this.surgeryTypeValue.trim().toLocaleLowerCase();
    if (!search) {
      return this.catalog;
    }

    return this.catalog.filter((item) => {
      const description = item.description?.toLocaleLowerCase() ?? '';
      return item.name.toLocaleLowerCase().includes(search) || description.includes(search);
    });
  }

  protected onSurgeryTypeChanged(value: string): void {
    this.surgeryTypeValue = value;
    const matched = this.catalog.find((item) => item.name === value.trim()) ?? null;
    this.selectedCatalogId = matched?.id ?? null;
    this.formError = null;
  }

  protected onCatalogSelection(isUserInput: boolean, option: CatalogAdminItem): void {
    if (!isUserInput) {
      return;
    }

    this.surgeryTypeValue = option.name;
    this.selectedCatalogId = option.id;
    this.formError = null;
  }

  protected buildTitle(): string {
    return this.initialSurgery ? 'Editar cirugía' : 'Agregar cirugía';
  }

  protected buildDescription(): string {
    return this.initialSurgery
      ? `Actualiza la cirugía longitudinal de ${this.patientName}.`
      : `Registra una cirugía longitudinal para ${this.patientName}.`;
  }

  protected showCatalogSupport(option: CatalogAdminItem): string | null {
    const description = option.description?.trim();
    if (!description) {
      return option.requiresAnesthesia ? 'Requiere anestesia' : null;
    }

    return option.requiresAnesthesia ? `${description} · Requiere anestesia` : description;
  }

  protected isDateRangeInvalid(): boolean {
    if (!this.scheduledDate || !this.performedDate) {
      return false;
    }

    return this.performedDate < this.scheduledDate;
  }

  protected isPerformedDateInFuture(): boolean {
    if (!this.performedDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${this.performedDate}T00:00:00`) > today;
  }

  protected isDescriptionTooLong(): boolean {
    return this.description.trim().length > this.textAreaMaxLength;
  }

  protected isPostoperativeInstructionsTooLong(): boolean {
    return this.postoperativeInstructions.trim().length > this.textAreaMaxLength;
  }

  private hydrateForm(): void {
    const surgery = this.initialSurgery;
    this.surgeryTypeValue = surgery?.surgeryType ?? '';
    this.selectedCatalogId = surgery?.catalogId ?? null;
    this.surgeryStatus = surgery?.surgeryStatus ?? 'FINALIZADA';
    this.scheduledDate = surgery?.scheduledDate?.slice(0, 10) ?? '';
    this.performedDate = surgery?.performedDate?.slice(0, 10) ?? '';
    this.description = surgery?.description ?? '';
    this.postoperativeInstructions = surgery?.postoperativeInstructions ?? '';
    this.formError = null;
  }

  private normalizeText(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeDateField(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
