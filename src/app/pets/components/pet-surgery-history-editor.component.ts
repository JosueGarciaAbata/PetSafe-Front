import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CatalogAdminItem } from '@app/catalogs/admin/models/catalog-admin.model';
import {
  PET_TEXTAREA_MAX_LENGTH,
} from '../models/pet-form-validation.util';
import {
  PetSurgeryApiResponse,
  PetSurgeryStatus,
} from '../models/pet-surgery.model';

type SurgeryStatusOption = {
  value: PetSurgeryStatus;
  label: string;
};

@Component({
  selector: 'app-pet-surgery-history-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './pet-surgery-history-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetSurgeryHistoryEditorComponent {
  private tempIdSequence = -1;

  @Input() surgeries: PetSurgeryApiResponse[] = [];
  @Input() catalog: CatalogAdminItem[] = [];
  @Input() isCatalogLoading = false;

  @Output() readonly surgeriesChange = new EventEmitter<PetSurgeryApiResponse[]>();

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
  protected editingSurgeryId: number | null = null;
  protected formError: string | null = null;

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

  protected profileManagedSurgeries(): PetSurgeryApiResponse[] {
    return this.surgeries.filter((item) => item.encounterId === null);
  }

  protected encounterLinkedSurgeries(): PetSurgeryApiResponse[] {
    return this.surgeries.filter((item) => item.encounterId !== null);
  }

  protected hasAnySurgery(): boolean {
    return this.surgeries.length > 0;
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

  protected saveSurgery(): void {
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

    const existing =
      this.editingSurgeryId !== null
        ? this.profileManagedSurgeries().find((item) => item.id === this.editingSurgeryId) ?? null
        : null;

    const nextItem: PetSurgeryApiResponse = {
      id: existing?.id ?? this.tempIdSequence--,
      encounterId: null,
      catalogId: selectedCatalog?.id ?? null,
      surgeryType: selectedCatalog?.name ?? normalizedType,
      scheduledDate: this.normalizeDateField(this.scheduledDate),
      performedDate: this.normalizeDateField(this.performedDate),
      surgeryStatus: this.surgeryStatus,
      isExternal: true,
      description: this.normalizeText(this.description),
      postoperativeInstructions: this.normalizeText(this.postoperativeInstructions),
    };

    const preservedEncounterItems = this.encounterLinkedSurgeries();
    const updatedProfileItems = existing
      ? this.profileManagedSurgeries().map((item) => (item.id === existing.id ? nextItem : item))
      : [...this.profileManagedSurgeries(), nextItem];

    this.surgeriesChange.emit([...updatedProfileItems, ...preservedEncounterItems]);
    this.resetEditor();
  }

  protected editSurgery(item: PetSurgeryApiResponse): void {
    if (item.encounterId !== null) {
      return;
    }

    this.editingSurgeryId = item.id;
    this.surgeryTypeValue = item.surgeryType;
    this.selectedCatalogId = item.catalogId ?? null;
    this.surgeryStatus = item.surgeryStatus;
    this.scheduledDate = item.scheduledDate?.slice(0, 10) ?? '';
    this.performedDate = item.performedDate?.slice(0, 10) ?? '';
    this.description = item.description ?? '';
    this.postoperativeInstructions = item.postoperativeInstructions ?? '';
    this.formError = null;
  }

  protected removeSurgery(itemId: number): void {
    const remaining = this.surgeries.filter(
      (item) => item.encounterId !== null || item.id !== itemId,
    );
    this.surgeriesChange.emit(remaining);

    if (this.editingSurgeryId === itemId) {
      this.resetEditor();
    }
  }

  protected cancelEditing(): void {
    this.resetEditor();
  }

  protected isEditing(): boolean {
    return this.editingSurgeryId !== null;
  }

  protected buildStatusLabel(status: PetSurgeryStatus): string {
    return (
      this.surgeryStatusOptions.find((option) => option.value === status)?.label
      ?? status
    );
  }

  protected buildSourceLabel(item: PetSurgeryApiResponse): string {
    return item.isExternal || item.encounterId === null ? 'Externa' : 'Desde atención';
  }

  protected buildSurgeryDateMeta(item: PetSurgeryApiResponse): string {
    if (item.performedDate) {
      return `Realizada ${item.performedDate.slice(0, 10)}`;
    }

    if (item.scheduledDate) {
      return `Programada ${item.scheduledDate.slice(0, 10)}`;
    }

    return 'Sin fecha registrada';
  }

  protected showCatalogSupport(option: CatalogAdminItem): string | null {
    const description = option.description?.trim();
    if (!description) {
      return option.requiresAnesthesia ? 'Requiere anestesia' : null;
    }

    return option.requiresAnesthesia ? `${description} · Requiere anestesia` : description;
  }

  protected isDescriptionTooLong(): boolean {
    return this.description.trim().length > this.textAreaMaxLength;
  }

  protected isPostoperativeInstructionsTooLong(): boolean {
    return this.postoperativeInstructions.trim().length > this.textAreaMaxLength;
  }

  private normalizeText(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeDateField(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
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

  private resetEditor(): void {
    this.editingSurgeryId = null;
    this.surgeryTypeValue = '';
    this.selectedCatalogId = null;
    this.surgeryStatus = 'FINALIZADA';
    this.scheduledDate = '';
    this.performedDate = '';
    this.description = '';
    this.postoperativeInstructions = '';
    this.formError = null;
  }
}
