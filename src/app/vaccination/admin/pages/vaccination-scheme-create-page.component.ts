import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { SpeciesApiResponse } from '@app/pets/models/species.model';
import { SpeciesApiService } from '@app/pets/services/species-api.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import { VaccinationProductItem } from '../models/vaccination-admin.model';

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
  selector: 'app-vaccination-scheme-create-page',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ShellIconComponent,
  ],
  templateUrl: './vaccination-scheme-create-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemeCreatePageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private isSelectingSpecies = false;
  private selectingDoseIndex: number | null = null;

  protected readonly speciesOptions: SpeciesApiResponse[] = [];
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
  protected isLoadingSpecies = false;
  protected isLoadingProducts = false;
  protected isSaving = false;
  protected errorMessage: string | null = null;
  protected showValidationErrors = false;

  ngOnInit(): void {
    void this.loadSpecies();
  }

  protected goBack(): void {
    void this.router.navigate(['/vaccination/schemes']);
  }

  protected async onSpeciesChanged(value: string): Promise<void> {
    this.speciesSearch = value;
    if (this.isSelectingSpecies) {
      this.isSelectingSpecies = false;
      return;
    }

    const normalized = value.trim().toLowerCase();
    this.selectedSpecies = this.speciesOptions.find((s) => s.name.trim().toLowerCase() === normalized) ?? null;
    if (!this.selectedSpecies) {
      this.products = [];
    }
  }

  protected async onSpeciesSelected(isUserInput: boolean, species: SpeciesApiResponse): Promise<void> {
    if (!isUserInput) return;
    this.isSelectingSpecies = true;
    this.selectedSpecies = species;
    this.speciesSearch = species.name;
    await this.loadProductsForSpecies(species.id);
  }

  protected filteredSpecies(): SpeciesApiResponse[] {
    const term = this.speciesSearch.trim().toLowerCase();
    if (!term) return this.speciesOptions;
    return this.speciesOptions.filter((s) => s.name.toLowerCase().includes(term));
  }

  protected addDose(): void {
    this.doses.push(this.createDoseDraft());
  }

  protected reorderDoses(event: CdkDragDrop<SchemeDoseDraft[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.doses, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  protected removeDose(index: number): void {
    if (this.doses.length === 1) return;
    this.doses.splice(index, 1);
  }

  protected onDoseVaccineChanged(index: number, value: string): void {
    this.doses[index].vaccineSearch = value;
    if (this.selectingDoseIndex === index) {
      this.selectingDoseIndex = null;
      return;
    }
    const normalized = value.trim().toLowerCase();
    const matched = this.products.find((p) => p.name.trim().toLowerCase() === normalized) ?? null;
    this.doses[index].vaccineId = matched?.id ?? null;
  }

  protected onDoseVaccineSelected(index: number, isUserInput: boolean, product: VaccinationProductItem): void {
    if (!isUserInput) return;
    this.selectingDoseIndex = index;
    this.doses[index].vaccineId = product.id;
    this.doses[index].vaccineSearch = product.name;
  }

  protected filteredProducts(term: string): VaccinationProductItem[] {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return this.products;
    return this.products.filter((p) => p.name.toLowerCase().includes(normalized));
  }

  protected async save(): Promise<void> {
    this.showValidationErrors = true;
    this.errorMessage = null;

    if (!this.name.trim() || !this.selectedSpecies) {
      return;
    }
    const invalidDoseIndex = this.doses.findIndex((dose) => !dose.vaccineId);
    if (invalidDoseIndex >= 0) {
      this.errorMessage = `Debes seleccionar la vacuna de la dosis ${invalidDoseIndex + 1}.`;
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const created = await firstValueFrom(
        this.vaccinationApi.createScheme({
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
        }),
      );
      this.toast.success('Esquema vacunal creado.');
      void this.router.navigate(['/vaccination/schemes', created.id]);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear el esquema vacunal.',
      });
      this.toast.error(this.errorMessage);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected hasNameError(): boolean {
    return this.showValidationErrors && !this.name.trim();
  }

  protected hasSpeciesError(): boolean {
    return this.showValidationErrors && !this.selectedSpecies;
  }

  private async loadSpecies(): Promise<void> {
    this.isLoadingSpecies = true;
    this.cdr.markForCheck();
    try {
      const response = await firstValueFrom(this.speciesApi.list({ page: 1, limit: 100 }));
      this.speciesOptions.splice(0, this.speciesOptions.length, ...response.data);
    } catch {
      this.toast.error('No se pudo cargar la lista de especies.');
    } finally {
      this.isLoadingSpecies = false;
      this.cdr.markForCheck();
    }
  }

  private async loadProductsForSpecies(speciesId: number): Promise<void> {
    this.isLoadingProducts = true;
    this.products = [];
    this.doses = this.doses.map((dose) => ({ ...dose, vaccineId: null, vaccineSearch: '' }));
    this.cdr.markForCheck();
    try {
      const response = await firstValueFrom(this.vaccinationApi.listProducts(speciesId));
      this.products = response.filter((product) => product.isActive);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudieron cargar los productos de la especie seleccionada.',
      });
    } finally {
      this.isLoadingProducts = false;
      this.cdr.markForCheck();
    }
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
