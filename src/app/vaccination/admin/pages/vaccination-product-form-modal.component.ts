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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SpeciesApiResponse } from '@app/pets/models/species.model';
import {
  CreateVaccinationProductRequest,
  VaccinationProductItem,
} from '../models/vaccination-admin.model';

@Component({
  selector: 'app-vaccination-product-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './vaccination-product-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationProductFormModalComponent implements OnChanges {
  private isSelectingSpecies = false;

  @Input() open = false;
  @Input() speciesOptions: SpeciesApiResponse[] = [];
  @Input() product: VaccinationProductItem | null = null;
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<CreateVaccinationProductRequest>();

  protected name = '';
  protected speciesSearch = '';
  protected selectedSpecies: SpeciesApiResponse | null = null;
  protected isRevaccination = false;
  protected showValidationErrors = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['open']?.currentValue === true && changes['open']?.previousValue !== true
      || changes['product']
    ) {
      this.resetForm();
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

    if (!this.name.trim() || !this.selectedSpecies) {
      return;
    }

    this.saved.emit({
      name: this.name.trim(),
      speciesId: this.selectedSpecies.id,
      isRevaccination: this.isRevaccination,
    });
  }

  protected onSpeciesChanged(value: string): void {
    this.speciesSearch = value;

    if (this.isSelectingSpecies) {
      this.isSelectingSpecies = false;
      return;
    }

    const normalized = value.trim().toLowerCase();
    this.selectedSpecies = this.speciesOptions.find(
      (species) => species.name.trim().toLowerCase() === normalized,
    ) ?? null;
  }

  protected onSpeciesSelected(isUserInput: boolean, species: SpeciesApiResponse): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingSpecies = true;
    this.selectedSpecies = species;
    this.speciesSearch = species.name;
  }

  protected filteredSpecies(): SpeciesApiResponse[] {
    const term = this.speciesSearch.trim().toLowerCase();
    if (!term) {
      return this.speciesOptions;
    }

    return this.speciesOptions.filter((species) =>
      species.name.toLowerCase().includes(term),
    );
  }

  protected hasNameError(): boolean {
    return this.showValidationErrors && !this.name.trim();
  }

  protected hasSpeciesError(): boolean {
    return this.showValidationErrors && !this.selectedSpecies;
  }

  private resetForm(): void {
    this.showValidationErrors = false;
    this.name = this.product?.name ?? '';
    this.selectedSpecies =
      this.speciesOptions.find((species) => species.id === this.product?.species.id) ?? null;
    this.speciesSearch = this.selectedSpecies?.name ?? '';
    this.isRevaccination = this.product?.isRevaccination ?? false;
  }
}
