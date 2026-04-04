import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import { PetCreateResponseApiResponse } from '@app/pets/models/pet-create-response.model';
import { PetListItemApiResponse } from '@app/pets/models/pet-list.model';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { AdoptionTagsApiService } from '../api/adoption-tags-api.service';
import { AdoptionsApiService } from '../api/adoptions-api.service';
import { AdoptionTagSummaryApiResponse } from '../models/adoption-tag.model';

interface AdoptionPatientOption {
  id: number;
  name: string;
  speciesName: string | null;
  breedName: string | null;
  currentWeight: number | null;
  birthDate: string | null;
  ageYears: number | null;
  tutorName: string | null;
  tutorContact: string | null;
}

@Component({
  selector: 'app-adoption-create-page',
  standalone: true,
  imports: [
    PaginationComponent,
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './adoption-create-page.component.html',
  styleUrl: './adoption-create-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionCreatePageComponent implements OnInit, OnDestroy {
  private readonly adoptionsApi = inject(AdoptionsApiService);
  private readonly adoptionTagsApi = inject(AdoptionTagsApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;
  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private tagSearchTimer?: ReturnType<typeof setTimeout>;
  private tagRequestVersion = 0;
  private readonly navigationState = history.state as {
    selectedPatientFromPetCreate?: PetCreateResponseApiResponse | null;
  } | null;

  protected readonly contactPhoneMaxLength = 25;
  protected readonly contactNameMaxLength = 120;
  protected readonly contactEmailMaxLength = 255;
  protected readonly storyMaxLength = 2000;
  protected readonly requirementsMaxLength = 1000;
  protected readonly notesMaxLength = 500;

  protected patientSearchValue = '';
  protected tagSearchValue = '';
  protected patients: AdoptionPatientOption[] = [];
  protected tagResults: AdoptionTagSummaryApiResponse[] = [];
  protected selectedTags: AdoptionTagSummaryApiResponse[] = [];
  protected activeStep: 'select-patient' | 'adoption-details' = 'select-patient';
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected selectedPatient: AdoptionPatientOption | null = null;
  protected isLoadingPatients = false;
  protected isLoadingTags = false;
  protected isCreatingTag = false;
  protected isSaving = false;
  protected loadError: string | null = null;
  protected submitError: string | null = null;
  protected tagError: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    contactPhone: ['', [trimmedRequiredValidator(), Validators.maxLength(this.contactPhoneMaxLength)]],
    contactName: ['', [Validators.maxLength(this.contactNameMaxLength)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(this.contactEmailMaxLength)]],
    story: ['', [Validators.maxLength(this.storyMaxLength)]],
    requirements: ['', [Validators.maxLength(this.requirementsMaxLength)]],
    notes: ['', [Validators.maxLength(this.notesMaxLength)]],
  });

  ngOnInit(): void {
    const patientFromState = this.mapCreatedPetToPatient(this.navigationState?.selectedPatientFromPetCreate);
    if (patientFromState) {
      this.selectedPatient = patientFromState;
      this.activeStep = 'adoption-details';
    }

    void this.loadPatients(1);
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
    this.clearTagSearchTimer();
  }

  protected onSearchInput(value: string): void {
    this.patientSearchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadPatients(page);
  }

  protected retryLoadPatients(): void {
    void this.loadPatients(this.meta.currentPage);
  }

  protected selectPatient(patient: AdoptionPatientOption): void {
    this.selectedPatient = patient;
    this.submitError = null;
    this.activeStep = 'adoption-details';
    this.cdr.markForCheck();
  }

  protected goToPatientSelection(): void {
    this.submitError = null;
    this.activeStep = 'select-patient';
    this.cdr.markForCheck();
  }

  protected onTagSearchInput(value: string): void {
    this.tagSearchValue = value;
    this.tagError = null;
    this.scheduleTagSearch();
  }

  protected onTagOptionSelection(
    isUserInput: boolean,
    tag: AdoptionTagSummaryApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.addTag(tag);
  }

  protected onCreateTagOptionSelection(isUserInput: boolean): void {
    if (!isUserInput) {
      return;
    }

    void this.createTagFromSearch();
  }

  protected async createTagFromSearch(): Promise<void> {
    const tagName = this.normalizeOptionalText(this.tagSearchValue);
    if (!tagName || this.isCreatingTag) {
      return;
    }

    this.tagError = null;
    this.isCreatingTag = true;
    this.cdr.markForCheck();

    try {
      const createdTag = await firstValueFrom(this.adoptionTagsApi.create(tagName));
      this.addTag(createdTag);
      this.tagResults = [];
      this.tagSearchValue = '';
    } catch (error: unknown) {
      this.tagError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear el tag.',
        clientErrorMessage: 'Revisa el nombre del tag antes de continuar.',
      });
    } finally {
      this.isCreatingTag = false;
      this.cdr.markForCheck();
    }
  }

  protected addTag(tag: AdoptionTagSummaryApiResponse): void {
    if (this.selectedTags.some((item) => item.id === tag.id)) {
      this.tagSearchValue = '';
      this.tagResults = [];
      this.tagError = null;
      this.cdr.markForCheck();
      return;
    }

    this.selectedTags = [...this.selectedTags, tag];
    this.tagSearchValue = '';
    this.tagResults = [];
    this.tagError = null;
    this.cdr.markForCheck();
  }

  protected removeTag(tagId: number): void {
    this.selectedTags = this.selectedTags.filter((tag) => tag.id !== tagId);
    this.cdr.markForCheck();
  }

  protected openCreatePetPage(): void {
    void this.router.navigate(['/adoption/new/pet']);
  }

  protected shouldShowTagResults(): boolean {
    return (
      this.isLoadingTags ||
      this.tagResults.length > 0 ||
      this.shouldShowCreateTagOption()
    ) && this.tagSearchValue.trim().length > 0;
  }

  protected shouldShowCreateTagOption(): boolean {
    const normalizedSearch = this.tagSearchValue.trim().toLowerCase();
    if (!normalizedSearch || this.isLoadingTags || this.isCreatingTag) {
      return false;
    }

    const matchesExact =
      this.tagResults.some((tag) => tag.name.trim().toLowerCase() === normalizedSearch) ||
      this.selectedTags.some((tag) => tag.name.trim().toLowerCase() === normalizedSearch);
    return !matchesExact;
  }

  protected shouldShowError(controlName: 'contactPhone' | 'contactName' | 'contactEmail' | 'story' | 'requirements' | 'notes'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected async save(): Promise<void> {
    if (!this.selectedPatient) {
      this.submitError = 'Debes seleccionar una mascota antes de crear la adopcion.';
      this.activeStep = 'select-patient';
      this.cdr.markForCheck();
      return;
    }

    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      this.submitError = null;
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      const formValue = this.form.getRawValue();
      await firstValueFrom(
        this.adoptionsApi.create({
          patientId: this.selectedPatient.id,
          contactPhone: formValue.contactPhone.trim(),
          story: this.normalizeOptionalText(formValue.story),
          requirements: this.normalizeOptionalText(formValue.requirements),
          notes: this.normalizeOptionalText(formValue.notes),
          contactName: this.normalizeOptionalText(formValue.contactName),
          contactEmail: this.normalizeOptionalText(formValue.contactEmail),
          tagIds: this.selectedTags.length > 0 ? this.selectedTags.map((tag) => tag.id) : undefined,
        }),
      );

      void this.router.navigate(['/adoption'], {
        state: {
          successMessage: `Adopcion registrada para ${this.selectedPatient.name}.`,
        },
      });
    } catch (error: unknown) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo registrar la adopcion.',
        clientErrorMessage: 'Revisa los datos ingresados antes de continuar.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected getInitials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || 'A';
  }

  protected buildPatientSubtitle(patient: AdoptionPatientOption): string {
    const species = patient.speciesName?.trim() || 'Sin especie registrada';
    const breed = patient.breedName?.trim() || 'Sin raza registrada';
    return `${species} - ${breed}`;
  }

  protected buildPatientMeta(patient: AdoptionPatientOption): string {
    const age = this.buildAgeLabel(patient);
    const weight = this.buildWeightLabel(patient);
    return `${age} - ${weight}`;
  }

  protected buildTutorMeta(patient: AdoptionPatientOption): string {
    const tutor = patient.tutorName?.trim() || 'Sin tutor registrado';
    const contact = patient.tutorContact?.trim() || 'Sin contacto registrado';
    return `${tutor} | ${contact}`;
  }

  private buildAgeLabel(patient: AdoptionPatientOption): string {
    if (patient.ageYears === null || patient.ageYears === undefined) {
      return 'Edad no registrada';
    }

    return `${patient.ageYears} ${patient.ageYears === 1 ? 'ano' : 'anos'}`;
  }

  private buildWeightLabel(patient: AdoptionPatientOption): string {
    if (patient.currentWeight === null || patient.currentWeight === undefined) {
      return 'Peso no registrado';
    }

    return `${patient.currentWeight} kg`;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadPatients(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private clearTagSearchTimer(): void {
    if (this.tagSearchTimer !== undefined) {
      clearTimeout(this.tagSearchTimer);
      this.tagSearchTimer = undefined;
    }
  }

  private scheduleTagSearch(): void {
    this.clearTagSearchTimer();

    const normalizedSearch = this.tagSearchValue.trim();
    if (!normalizedSearch) {
      this.tagResults = [];
      this.isLoadingTags = false;
      this.cdr.markForCheck();
      return;
    }

    this.tagSearchTimer = setTimeout(() => {
      void this.loadTags(normalizedSearch);
    }, 250);
  }

  private async loadPatients(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoadingPatients = true;
    this.loadError = null;
    this.patients = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.petsApi.list({
          page,
          limit: this.pageSize,
          search: this.patientSearchValue.trim() || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.patients = response.data.map((item) => this.mapPetListItemToPatient(item));
      this.meta = response.meta;

      if (this.selectedPatient) {
        this.selectedPatient =
          this.patients.find((item) => item.id === this.selectedPatient?.id) ?? this.selectedPatient;
      }
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el listado de mascotas.';
      this.meta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoadingPatients = false;
      this.cdr.detectChanges();
    }
  }

  private async loadTags(search: string): Promise<void> {
    const requestToken = ++this.tagRequestVersion;
    this.isLoadingTags = true;
    this.tagError = null;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(this.adoptionTagsApi.searchSummary(search, 10));
      if (requestToken !== this.tagRequestVersion) {
        return;
      }

      this.tagResults = response.filter(
        (tag) => !this.selectedTags.some((selectedTag) => selectedTag.id === tag.id),
      );
    } catch {
      if (requestToken !== this.tagRequestVersion) {
        return;
      }

      this.tagResults = [];
      this.tagError = 'No se pudieron buscar tags.';
    } finally {
      if (requestToken !== this.tagRequestVersion) {
        return;
      }

      this.isLoadingTags = false;
      this.cdr.markForCheck();
    }
  }

  private mapPetListItemToPatient(item: PetListItemApiResponse): AdoptionPatientOption {
    return {
      id: item.id,
      name: item.name,
      speciesName: item.species?.name ?? null,
      breedName: item.breed?.name ?? null,
      currentWeight: item.currentWeight ?? null,
      birthDate: item.birthDate ?? null,
      ageYears: item.ageYears ?? null,
      tutorName: item.tutorName ?? null,
      tutorContact: item.tutorContact ?? null,
    };
  }

  private mapCreatedPetToPatient(
    createdPet: PetCreateResponseApiResponse | null | undefined,
  ): AdoptionPatientOption | null {
    if (!createdPet) {
      return null;
    }

    return {
      id: createdPet.id,
      name: createdPet.name,
      speciesName: createdPet.species?.name ?? null,
      breedName: createdPet.breed?.name ?? null,
      currentWeight: createdPet.currentWeight ?? null,
      birthDate: createdPet.birthDate ?? null,
      ageYears: this.resolveAgeFromBirthDate(createdPet.birthDate),
      tutorName: null,
      tutorContact: null,
    };
  }

  private resolveAgeFromBirthDate(birthDate: string | null | undefined): number | null {
    if (!birthDate) {
      return null;
    }

    const parsedDate = new Date(birthDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const today = new Date();
    let years = today.getFullYear() - parsedDate.getFullYear();
    const monthDiff = today.getMonth() - parsedDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedDate.getDate())) {
      years -= 1;
    }

    return Math.max(years, 0);
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
}

function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value.length > 0 ? null : { required: true };
  };
}
