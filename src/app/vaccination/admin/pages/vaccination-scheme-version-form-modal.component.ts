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
import { VaccinationProductItem, CreateVaccinationSchemeVersionRequest } from '../models/vaccination-admin.model';

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
  selector: 'app-vaccination-scheme-version-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './vaccination-scheme-version-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemeVersionFormModalComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private selectingDoseIndex: number | null = null;

  @Input() open = false;
  @Input() schemeName = 'Esquema';
  @Input() products: VaccinationProductItem[] = [];
  @Input() nextVersion = 1;
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<CreateVaccinationSchemeVersionRequest>();

  protected version = 1;
  protected validFrom = new Date().toISOString().slice(0, 10);
  protected generalIntervalDays: number | null = null;
  protected revaccinationRule = '';
  protected changeReason = '';
  protected doses: VersionDoseDraft[] = [this.createDoseDraft()];
  protected localError: string | null = null;
  protected showValidationErrors = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true && changes['open']?.previousValue !== true) {
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

    return this.products.filter((product) => product.name.toLowerCase().includes(normalized));
  }

  protected submit(): void {
    this.showValidationErrors = true;
    this.localError = null;

    const invalidDoseIndex = this.doses.findIndex((dose) => !dose.vaccineId);
    if (invalidDoseIndex >= 0) {
      this.localError = `Debes seleccionar la vacuna de la dosis ${invalidDoseIndex + 1}.`;
      this.cdr.markForCheck();
      return;
    }

    this.saved.emit({
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
    });
  }

  private resetForm(): void {
    this.version = this.nextVersion;
    this.validFrom = new Date().toISOString().slice(0, 10);
    this.generalIntervalDays = null;
    this.revaccinationRule = '';
    this.changeReason = '';
    this.doses = [this.createDoseDraft()];
    this.localError = null;
    this.showValidationErrors = false;
    this.cdr.markForCheck();
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
}
