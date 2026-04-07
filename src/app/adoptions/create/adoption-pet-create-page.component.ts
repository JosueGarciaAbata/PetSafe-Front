import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
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
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import {
  PET_MAX_BIRTH_DATE,
  PET_MICROCHIP_MAX_LENGTH,
  PET_MIN_BIRTH_DATE,
  PET_NAME_MAX_LENGTH,
  PET_TEXTAREA_MAX_LENGTH,
  PET_WEIGHT_MAX,
  PET_WEIGHT_STEP,
  isValidPetBirthDate,
  isValidPetName,
  normalizePetText,
  parsePositivePetWeight,
} from '@app/pets/models/pet-form-validation.util';
import { ColorApiResponse } from '@app/pets/models/color.model';
import { CreatePetWithoutTutorRequest } from '@app/pets/models/create-pet.model';
import { PetImageUploadValue } from '@app/pets/models/pet-image.model';
import { PetCreateResponseApiResponse } from '@app/pets/models/pet-create-response.model';
import { SpeciesApiResponse } from '@app/pets/models/species.model';
import { ColorsApiService } from '@app/pets/services/colors-api.service';
import { PetImageUploadService } from '@app/pets/services/pet-image-upload.service';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { SpeciesApiService } from '@app/pets/services/species-api.service';

@Component({
  selector: 'app-adoption-pet-create-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './adoption-pet-create-page.component.html',
  styleUrl: './adoption-pet-create-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionPetCreatePageComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly petsApi = inject(PetsApiService);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly colorsApi = inject(ColorsApiService);
  private readonly petImageUploadService = inject(PetImageUploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly nameMaxLength = PET_NAME_MAX_LENGTH;
  protected readonly textAreaMaxLength = PET_TEXTAREA_MAX_LENGTH;
  protected readonly microchipMaxLength = PET_MICROCHIP_MAX_LENGTH;
  protected readonly minBirthDate = PET_MIN_BIRTH_DATE;
  protected readonly maxBirthDate = PET_MAX_BIRTH_DATE;
  protected readonly weightMax = PET_WEIGHT_MAX;
  protected readonly weightStep = PET_WEIGHT_STEP;
  protected showValidationErrors = false;

  protected readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.maxLength(PET_NAME_MAX_LENGTH), petNameValidator()],
    ],
    speciesId: [0, [Validators.min(1)]],
    breedId: [0],
    colorId: [0],
    sex: ['HEMBRA' as 'MACHO' | 'HEMBRA', Validators.required],
    birthDate: ['', [petBirthDateValidator()]],
    currentWeight: ['', [petWeightValidator()]],
    sterilized: [true],
    microchipCode: ['', [Validators.maxLength(PET_MICROCHIP_MAX_LENGTH)]],
    distinguishingMarks: ['', [Validators.maxLength(PET_TEXTAREA_MAX_LENGTH)]],
    generalAllergies: ['', [Validators.maxLength(PET_TEXTAREA_MAX_LENGTH)]],
    generalHistory: ['', [Validators.maxLength(PET_TEXTAREA_MAX_LENGTH)]],
  });

  protected species: SpeciesApiResponse[] = [];
  protected colors: ColorApiResponse[] = [];
  protected isLoadingCatalogs = true;
  protected isSaving = false;
  protected errorMessage: string | null = null;
  protected imageSelectionError: string | null = null;
  protected imageUpload: PetImageUploadValue | null = null;

  constructor() {
    void this.loadCatalogs();
  }

  ngOnDestroy(): void {
    this.clearSelectedImage();
  }

  protected get selectedSpecies(): SpeciesApiResponse | null {
    return this.species.find((item) => item.id === this.form.controls.speciesId.value) ?? null;
  }

  protected get breedOptions() {
    return this.selectedSpecies?.breeds ?? [];
  }

  protected setSex(value: 'MACHO' | 'HEMBRA'): void {
    this.form.controls.sex.setValue(value);
  }

  protected setSterilized(value: boolean): void {
    this.form.controls.sterilized.setValue(value);
  }

  protected onSpeciesChange(): void {
    const selectedBreedId = this.form.controls.breedId.value;
    if (!this.breedOptions.some((breed) => breed.id === selectedBreedId)) {
      this.form.controls.breedId.setValue(0);
    }
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessage = null;
    this.imageSelectionError = null;

    try {
      const preparedImage = await this.petImageUploadService.prepareImage(file);
      this.replaceSelectedImage(preparedImage);
    } catch (error) {
      this.imageSelectionError =
        error instanceof Error ? error.message : 'No se pudo preparar la imagen.';
      input.value = '';
    } finally {
      this.cdr.markForCheck();
    }
  }

  protected clearImageSelection(fileInput?: HTMLInputElement): void {
    this.imageSelectionError = null;
    this.clearSelectedImage();

    if (fileInput) {
      fileInput.value = '';
    }

    this.cdr.markForCheck();
  }

  protected hasSelectedImage(): boolean {
    return this.imageUpload !== null;
  }

  protected selectedImagePreviewUrl(): string | null {
    return this.imageUpload?.previewUrl ?? null;
  }

  protected selectedImageName(): string | null {
    return this.imageUpload?.file.name ?? null;
  }

  protected selectedImageSizeLabel(): string | null {
    if (!this.imageUpload) {
      return null;
    }

    return this.formatFileSize(this.imageUpload.file.size);
  }

  protected shouldShowError(control: AbstractControl | null): boolean {
    if (!control) {
      return false;
    }

    return control.invalid && (control.touched || this.showValidationErrors);
  }

  protected async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.showValidationErrors = true;
    const payload = this.buildPayload();
    if (!payload) {
      this.errorMessage = null;
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const createdPet = await firstValueFrom(this.petsApi.createWithoutTutor(payload));
      void this.navigateBackToAdoption(createdPet);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar la mascota.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async loadCatalogs(): Promise<void> {
    this.isLoadingCatalogs = true;
    this.cdr.markForCheck();

    try {
      const [speciesResponse, colorsResponse] = await Promise.all([
        firstValueFrom(this.speciesApi.list({ page: 1, limit: 100 })),
        firstValueFrom(this.colorsApi.list({ page: 1, limit: 100 })),
      ]);

      this.species = speciesResponse.data;
      this.colors = colorsResponse.data;
    } catch {
      this.errorMessage = 'No se pudieron cargar las opciones del formulario.';
    } finally {
      this.isLoadingCatalogs = false;
      this.cdr.markForCheck();
    }
  }

  private buildPayload(): CreatePetWithoutTutorRequest | null {
    const rawValue = this.form.getRawValue();
    const name = normalizePetText(rawValue.name);
    const speciesId = rawValue.speciesId;
    const breedId = rawValue.breedId > 0 ? rawValue.breedId : undefined;
    const colorId = rawValue.colorId > 0 ? rawValue.colorId : undefined;
    const birthDate = rawValue.birthDate.trim();
    const currentWeight = parsePositivePetWeight(String(rawValue.currentWeight ?? '').trim());
    const normalizedWeight = String(rawValue.currentWeight ?? '').trim();
    const microchipCode = normalizePetText(rawValue.microchipCode);
    const distinguishingMarks = normalizePetText(rawValue.distinguishingMarks);
    const generalAllergies = normalizePetText(rawValue.generalAllergies);
    const generalHistory = normalizePetText(rawValue.generalHistory);

    if (
      !isValidPetName(name) ||
      speciesId < 1 ||
      (birthDate.length > 0 && !isValidPetBirthDate(birthDate)) ||
      (normalizedWeight.length > 0 && currentWeight === null)
    ) {
      return null;
    }

    return {
      name,
      speciesId,
      sex: rawValue.sex,
      breedId,
      colorId,
      birthDate: birthDate || undefined,
      currentWeight: currentWeight ?? undefined,
      sterilized: rawValue.sterilized,
      microchipCode: microchipCode || undefined,
      distinguishingMarks: distinguishingMarks || undefined,
      generalAllergies: generalAllergies || undefined,
      generalHistory: generalHistory || undefined,
      image: this.imageUpload?.file,
    };
  }

  private async navigateBackToAdoption(createdPet: PetCreateResponseApiResponse): Promise<void> {
    await this.router.navigate(['/adoption/new'], {
      state: {
        selectedPatientFromPetCreate: createdPet,
      },
    });
  }

  private replaceSelectedImage(imageUpload: PetImageUploadValue): void {
    this.clearSelectedImage();
    this.imageUpload = imageUpload;
  }

  private clearSelectedImage(): void {
    this.petImageUploadService.revokePreviewUrl(this.imageUpload?.previewUrl);
    this.imageUpload = null;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kib = bytes / 1024;
    if (kib < 1024) {
      return `${kib.toFixed(1)} KB`;
    }

    return `${(kib / 1024).toFixed(2)} MB`;
  }
}

function petNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    if (!value.trim()) {
      return null;
    }

    return isValidPetName(value) ? null : { invalidPetName: true };
  };
}

function petBirthDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    if (!value.trim()) {
      return null;
    }

    return isValidPetBirthDate(value) ? null : { invalidPetBirthDate: true };
  };
}

function petWeightValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value === null || control.value === undefined ? '' : String(control.value).trim();
    if (!value) {
      return null;
    }

    return parsePositivePetWeight(value) === null ? { invalidPetWeight: true } : null;
  };
}
