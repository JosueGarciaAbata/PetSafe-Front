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
import { FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { VaccinationAdminApiService } from '@app/vaccination/admin/api/vaccination-admin-api.service';
import {
  VaccinationScheme,
  VaccinationSchemeVersion,
} from '@app/vaccination/admin/models/vaccination-admin.model';
import { InitializePatientVaccinationPlanRequest } from './models/patient-vaccination-plan.model';

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-initialize-vaccination-plan-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    ShellIconComponent,
  ],
  templateUrl: './initialize-vaccination-plan-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitializeVaccinationPlanModalComponent implements OnChanges {
  private readonly vaccinationAdminApi = inject(VaccinationAdminApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestVersion = 0;
  private isSelectingScheme = false;

  @Input() open = false;
  @Input() patientName = 'Paciente';
  @Input() speciesId: number | null = null;
  @Input() speciesName: string | null = null;
  @Input() isSaving = false;
  @Input() submitError: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<InitializePatientVaccinationPlanRequest>();

  protected isLoadingSchemes = false;
  protected loadError: string | null = null;
  protected schemes: VaccinationScheme[] = [];
  protected selectedScheme: VaccinationScheme | null = null;
  protected schemeSearch = '';
  protected showValidationErrors = false;
  protected readonly schemeErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.hasSchemeSelectionError(),
  );

  ngOnChanges(changes: SimpleChanges): void {
    const justOpened = changes['open']?.currentValue === true
      && changes['open']?.previousValue !== true;
    const speciesChangedWhileOpen = this.open
      && !!changes['speciesId']
      && changes['speciesId'].previousValue !== changes['speciesId'].currentValue;

    if (justOpened || speciesChangedWhileOpen) {
      void this.initialize();
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

    if (this.isLoadingSchemes || !this.selectedScheme) {
      return;
    }

    this.submitted.emit({
      vaccinationSchemeId: this.selectedScheme.id,
    });
  }

  protected onSchemeChanged(value: string): void {
    this.schemeSearch = value;

    if (this.isSelectingScheme) {
      this.isSelectingScheme = false;
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    this.selectedScheme = this.schemes.find((scheme) =>
      this.buildSchemeLabel(scheme).trim().toLowerCase() === normalizedValue,
    ) ?? null;
  }

  protected onSchemeOptionSelection(
    isUserInput: boolean,
    option: VaccinationScheme,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingScheme = true;
    this.selectScheme(option);
  }

  protected schemeOptions(): VaccinationScheme[] {
    const normalizedSearch = this.schemeSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.schemes;
    }

    return this.schemes.filter((scheme) => {
      const version = this.resolveUsableSchemeVersion(scheme);
      const haystack = [
        scheme.name,
        scheme.description ?? '',
        version ? `v${version.version}` : '',
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }

  protected buildSchemeLabel(scheme: VaccinationScheme): string {
    return scheme.name.trim();
  }

  protected buildSchemeMeta(scheme: VaccinationScheme): string {
    const version = this.resolveUsableSchemeVersion(scheme);
    const versionLabel = version ? `Versión vigente ${version.version}` : 'Sin versión utilizable';
    const description = scheme.description?.trim();

    return description ? `${versionLabel} · ${description}` : versionLabel;
  }

  protected hasSchemeSelectionError(): boolean {
    return this.showValidationErrors && !this.selectedScheme;
  }

  private async initialize(): Promise<void> {
    this.showValidationErrors = false;
    this.loadError = null;
    this.schemes = [];
    this.selectedScheme = null;
    this.schemeSearch = '';

    if (!this.speciesId) {
      this.loadError = 'No se pudo identificar la especie de la mascota para cargar esquemas.';
      this.cdr.detectChanges();
      return;
    }

    await this.loadSchemes(this.speciesId);
  }

  private async loadSchemes(speciesId: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoadingSchemes = true;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.vaccinationAdminApi.listSchemes(speciesId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.schemes = response
        .filter((scheme) => scheme.species.id === speciesId && this.resolveUsableSchemeVersion(scheme) !== null)
        .sort((left, right) => left.name.localeCompare(right.name));

      if (this.schemes.length > 0) {
        this.selectScheme(this.schemes[0]);
      }
    } catch (error: unknown) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudieron cargar los esquemas vacunales.',
      });
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoadingSchemes = false;
      this.cdr.detectChanges();
    }
  }

  private selectScheme(option: VaccinationScheme): void {
    this.selectedScheme = option;
    this.schemeSearch = this.buildSchemeLabel(option);
  }

  private resolveUsableSchemeVersion(
    scheme: VaccinationScheme,
  ): VaccinationSchemeVersion | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usableVersions = scheme.versions
      .filter((version) => version.status === 'VIGENTE')
      .filter((version) => {
        const validFrom = this.parseDateOnly(version.validFrom);
        const validTo = this.parseDateOnly(version.validTo);

        if (!validFrom || validFrom > today) {
          return false;
        }

        return !validTo || validTo >= today;
      })
      .sort((left, right) => {
        if (right.version !== left.version) {
          return right.version - left.version;
        }

        return (this.parseDateOnly(right.validFrom)?.getTime() ?? 0)
          - (this.parseDateOnly(left.validFrom)?.getTime() ?? 0);
      });

    return usableVersions[0] ?? null;
  }

  private parseDateOnly(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
}
