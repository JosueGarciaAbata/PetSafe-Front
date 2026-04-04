import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import { VaccinationProductItem, VaccinationScheme } from '../models/vaccination-admin.model';

interface VersionDoseDraft {
  vaccineSearch: string;
  vaccineId: number | null;
  ageStartWeeks: number | null;
  ageEndWeeks: number | null;
  intervalDays: number | null;
  isRequired: boolean;
  notes: string;
}

@Component({
  selector: 'app-vaccination-scheme-version-create-page',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ShellIconComponent,
  ],
  templateUrl: './vaccination-scheme-version-create-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemeVersionCreatePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private selectingDoseIndex: number | null = null;

  protected scheme: VaccinationScheme | null = null;
  protected products: VaccinationProductItem[] = [];
  protected baseVersionId: number | null = null;
  protected version = 1;
  protected validFrom = new Date().toISOString().slice(0, 10);
  protected generalIntervalDays: number | null = null;
  protected revaccinationRule = '';
  protected changeReason = '';
  protected doses: VersionDoseDraft[] = [this.createDoseDraft()];
  protected isLoading = false;
  protected isSaving = false;
  protected errorMessage: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id) {
        void this.router.navigate(['/vaccination/schemes']);
        return;
      }

      void this.loadScheme(id);
    });
  }

  protected goBack(): void {
    if (!this.scheme) {
      void this.router.navigate(['/vaccination/schemes']);
      return;
    }

    void this.router.navigate(['/vaccination/schemes', this.scheme.id]);
  }

  protected addDose(): void {
    this.doses.push(this.createDoseDraft());
  }

  protected duplicateDose(index: number): void {
    const source = this.doses[index];
    if (!source) {
      return;
    }

    this.doses.splice(index + 1, 0, {
      vaccineSearch: source.vaccineSearch,
      vaccineId: source.vaccineId,
      ageStartWeeks: source.ageStartWeeks,
      ageEndWeeks: source.ageEndWeeks,
      intervalDays: source.intervalDays,
      isRequired: source.isRequired,
      notes: source.notes,
    });
  }

  protected reorderDoses(event: CdkDragDrop<VersionDoseDraft[]>): void {
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

  protected availableBaseVersions(): VaccinationScheme['versions'] {
    return [...(this.scheme?.versions ?? [])].sort((left, right) => right.version - left.version);
  }

  protected applyBaseVersion(): void {
    if (!this.scheme || this.baseVersionId === null) {
      return;
    }

    const baseVersion =
      this.scheme.versions.find((item) => item.id === this.baseVersionId) ?? null;

    if (!baseVersion) {
      return;
    }

    this.generalIntervalDays = baseVersion.generalIntervalDays ?? null;
    this.revaccinationRule = baseVersion.revaccinationRule ?? '';
    this.changeReason = this.buildChangeReasonFromBase(baseVersion);
    this.doses = [...baseVersion.doses]
      .sort((left, right) => left.doseOrder - right.doseOrder)
      .map((dose) => ({
        vaccineSearch: dose.vaccineName,
        vaccineId: dose.vaccineId,
        ageStartWeeks: dose.ageStartWeeks,
        ageEndWeeks: dose.ageEndWeeks,
        intervalDays: dose.intervalDays,
        isRequired: dose.isRequired,
        notes: dose.notes ?? '',
      }));

    if (this.doses.length === 0) {
      this.doses = [this.createDoseDraft()];
    }

    this.toast.info(`Versión ${baseVersion.version} cargada como base editable.`);
    this.cdr.markForCheck();
  }

  protected async save(): Promise<void> {
    if (!this.scheme) return;
    const invalidDoseIndex = this.doses.findIndex((dose) => !dose.vaccineId);
    if (invalidDoseIndex >= 0) {
      this.errorMessage = `Debes seleccionar la vacuna de la dosis ${invalidDoseIndex + 1}.`;
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(
        this.vaccinationApi.createSchemeVersion(this.scheme.id, {
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
        }),
      );
      this.toast.success('Versión creada correctamente.');
      void this.router.navigate(['/vaccination/schemes', this.scheme.id]);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear la versión del esquema.',
      });
      this.toast.error(this.errorMessage);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async loadScheme(id: number): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
    try {
      const scheme = await firstValueFrom(this.vaccinationApi.getScheme(id));
      this.scheme = scheme;
      this.version = scheme.versions.reduce((max, item) => Math.max(max, item.version), 0) + 1;
      this.baseVersionId = this.availableBaseVersions()[0]?.id ?? null;
      const response = await firstValueFrom(this.vaccinationApi.listProducts(scheme.species.id));
      this.products = response.filter((product) => product.isActive);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el esquema.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private createDoseDraft(): VersionDoseDraft {
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

  private buildChangeReasonFromBase(version: VaccinationScheme['versions'][number]): string {
    const currentReason = this.changeReason.trim();
    if (currentReason.length > 0) {
      return currentReason;
    }

    return `Nueva versión basada en la versión ${version.version}.`;
  }
}
