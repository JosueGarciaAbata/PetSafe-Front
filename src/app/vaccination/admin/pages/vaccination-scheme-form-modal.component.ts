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
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { SpeciesApiResponse } from '@app/pets/models/species.model';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import {
  CreateVaccinationSchemeRequest,
  VaccinationProductItem,
} from '../models/vaccination-admin.model';

interface SchemeDoseDraft {
  vaccineSearch: string;
  vaccineId: number | null;
  ageStartWeeks: number | null;
  ageEndWeeks: number | null;
  intervalDays: number | null;
  isRequired: boolean;
  notes: string;
}

@Component({
  selector: 'app-vaccination-scheme-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './vaccination-scheme-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemeFormModalComponent implements OnChanges {
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private isSelectingSpecies = false;
  private selectingDoseIndex: number | null = null;

  @Input() open = false;
  @Input() speciesOptions: SpeciesApiResponse[] = [];
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<CreateVaccinationSchemeRequest>();

  protected name = '';
  protected description = '';
  protected speciesSearch = '';
  protected selectedSpecies: SpeciesApiResponse | null = null;
  protected version = 1;
  protected validFrom = new Date().toISOString().slice(0, 10);
  protected generalIntervalDays: number | null = null;
  protected revaccinationRule = '';
  protected changeReason = '';
  protected doses: SchemeDoseDraft[] = [this.createDoseDraft()];
  protected products: VaccinationProductItem[] = [];
  protected isLoadingProducts = false;
  protected localError: string | null = null;
  protected showValidationErrors = false;

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.close();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true && changes['open']?.previousValue !== true) {
      this.resetForm();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected async onSpeciesChanged(value: string): Promise<void> {
    this.speciesSearch = value;

    if (this.isSelectingSpecies) {
      this.isSelectingSpecies = false;
      return;
    }

    const normalized = value.trim().toLowerCase();
    this.selectedSpecies = this.speciesOptions.find(
      (species) => species.name.trim().toLowerCase() === normalized,
    ) ?? null;

    if (!this.selectedSpecies) {
      this.products = [];
    }
  }

  protected async onSpeciesSelected(
    isUserInput: boolean,
    species: SpeciesApiResponse,
  ): Promise<void> {
    if (!isUserInput) {
      return;
    }

    this.isSelectingSpecies = true;
    this.selectedSpecies = species;
    this.speciesSearch = species.name;
    await this.loadProductsForSpecies(species.id);
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

  protected addDose(): void {
    this.doses.push(this.createDoseDraft());
  }

  protected removeDose(index: number): void {
    if (this.doses.length === 1) {
      return;
    }

    this.doses.splice(index, 1);
  }

  protected onDoseVaccineChanged(index: number, value: string): void {
    this.doses[index].vaccineSearch = value;

    if (this.selectingDoseIndex === index) {
      this.selectingDoseIndex = null;
      return;
    }

    const normalized = value.trim().toLowerCase();
    const matched = this.products.find(
      (product) => product.name.trim().toLowerCase() === normalized,
    ) ?? null;

    this.doses[index].vaccineId = matched?.id ?? null;
  }

  protected onDoseVaccineSelected(
    index: number,
    isUserInput: boolean,
    product: VaccinationProductItem,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.selectingDoseIndex = index;
    this.doses[index].vaccineId = product.id;
    this.doses[index].vaccineSearch = product.name;
  }

  protected filteredProducts(term: string): VaccinationProductItem[] {
    const normalized = term.trim().toLowerCase();
    if (!normalized) {
      return this.products;
    }

    return this.products.filter((product) =>
      product.name.toLowerCase().includes(normalized),
    );
  }

  protected async submit(): Promise<void> {
    this.showValidationErrors = true;
    this.localError = null;

    if (!this.name.trim() || !this.selectedSpecies) {
      return;
    }

    const invalidDoseIndex = this.doses.findIndex((dose) => !dose.vaccineId);
    if (invalidDoseIndex >= 0) {
      this.localError = `Debes seleccionar la vacuna de la dosis ${invalidDoseIndex + 1}.`;
      return;
    }

    this.saved.emit({
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      speciesId: this.selectedSpecies.id,
      initialVersion: {
        version: this.version,
        status: 'VIGENTE',
        validFrom: this.validFrom,
        changeReason: this.changeReason.trim() || undefined,
        revaccinationRule: this.revaccinationRule.trim() || undefined,
        generalIntervalDays: this.generalIntervalDays ?? undefined,
        doses: this.doses.map((dose, index) => ({
          vaccineId: dose.vaccineId!,
          doseOrder: index + 1,
          ageStartWeeks: dose.ageStartWeeks ?? undefined,
          ageEndWeeks: dose.ageEndWeeks ?? undefined,
          intervalDays: dose.intervalDays ?? undefined,
          isRequired: dose.isRequired,
          notes: dose.notes.trim() || undefined,
        })),
      },
    });
  }

  protected hasNameError(): boolean {
    return this.showValidationErrors && !this.name.trim();
  }

  protected hasSpeciesError(): boolean {
    return this.showValidationErrors && !this.selectedSpecies;
  }

  private async loadProductsForSpecies(speciesId: number): Promise<void> {
    this.isLoadingProducts = true;
    this.localError = null;
    this.products = [];
    this.doses = this.doses.map((dose) => ({ ...dose, vaccineId: null, vaccineSearch: '' }));
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.vaccinationApi.listProducts({ speciesId }),
      );
      this.products = response.filter((product) => product.isActive);
    } catch (error: unknown) {
      this.localError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudieron cargar los productos de la especie seleccionada.',
      });
    } finally {
      this.isLoadingProducts = false;
      this.cdr.markForCheck();
    }
  }

  private resetForm(): void {
    this.name = '';
    this.description = '';
    this.speciesSearch = '';
    this.selectedSpecies = null;
    this.version = 1;
    this.validFrom = new Date().toISOString().slice(0, 10);
    this.generalIntervalDays = null;
    this.revaccinationRule = '';
    this.changeReason = '';
    this.doses = [this.createDoseDraft()];
    this.products = [];
    this.localError = null;
    this.showValidationErrors = false;
  }

  private createDoseDraft(): SchemeDoseDraft {
    return {
      vaccineSearch: '',
      vaccineId: null,
      ageStartWeeks: null,
      ageEndWeeks: null,
      intervalDays: null,
      isRequired: true,
      notes: '',
    };
  }
}
