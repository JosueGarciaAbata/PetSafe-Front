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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { PetImageUploadValue } from '@app/pets/models/pet-image.model';
import { PetBasicDetailApiResponse } from '@app/pets/models/pet-detail.model';
import { PetImageUploadService } from '@app/pets/services/pet-image-upload.service';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { AdoptionTagsApiService } from '../api/adoption-tags-api.service';
import { AdoptionsApiService } from '../api/adoptions-api.service';
import { AdoptionTagSummaryApiResponse } from '../models/adoption-tag.model';
import { AdoptionRecord } from '../models/adoption.model';

@Component({
  selector: 'app-adoption-edit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './adoption-edit-page.component.html',
  styleUrl: './adoption-edit-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionEditPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly adoptionsApi = inject(AdoptionsApiService);
  private readonly adoptionTagsApi = inject(AdoptionTagsApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly petImageUploadService = inject(PetImageUploadService);
  private tagSearchTimer?: ReturnType<typeof setTimeout>;
  private tagRequestVersion = 0;

  protected readonly contactPhoneMaxLength = 25;
  protected readonly contactNameMaxLength = 120;
  protected readonly contactEmailMaxLength = 255;
  protected readonly storyMaxLength = 2000;
  protected readonly requirementsMaxLength = 1000;
  protected readonly notesMaxLength = 500;

  protected adoption: AdoptionRecord | null = null;
  protected patient: PetBasicDetailApiResponse | null = null;
  protected tagSearchValue = '';
  protected tagResults: AdoptionTagSummaryApiResponse[] = [];
  protected selectedTags: AdoptionTagSummaryApiResponse[] = [];
  protected isLoading = true;
  protected isLoadingTags = false;
  protected isCreatingTag = false;
  protected isSaving = false;
  protected loadError: string | null = null;
  protected submitError: string | null = null;
  protected tagError: string | null = null;
  protected imageSelectionError: string | null = null;
  protected imageUpload: PetImageUploadValue | null = null;

  protected readonly form = this.fb.nonNullable.group({
    contactPhone: ['', [trimmedRequiredValidator(), Validators.maxLength(this.contactPhoneMaxLength)]],
    contactName: ['', [Validators.maxLength(this.contactNameMaxLength)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(this.contactEmailMaxLength)]],
    story: ['', [Validators.maxLength(this.storyMaxLength)]],
    requirements: ['', [Validators.maxLength(this.requirementsMaxLength)]],
    notes: ['', [Validators.maxLength(this.notesMaxLength)]],
  });

  ngOnInit(): void {
    const adoptionId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(adoptionId) || adoptionId < 1) {
      void this.router.navigate(['/adoption']);
      return;
    }

    void this.loadData(adoptionId);
  }

  ngOnDestroy(): void {
    this.clearTagSearchTimer();
    this.clearSelectedImage();
  }

  protected getInitials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || 'A';
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.submitError = null;
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

  protected hasPendingImage(): boolean {
    return this.imageUpload !== null;
  }

  protected displayImageUrl(): string | null {
    return this.imageUpload?.previewUrl ?? this.patient?.image?.url ?? null;
  }

  protected displayImageName(): string | null {
    return this.imageUpload?.file.name ?? this.patient?.image?.originalName ?? null;
  }

  protected displayImageSizeLabel(): string | null {
    if (this.imageUpload) {
      return this.formatFileSize(this.imageUpload.file.size);
    }

    if (this.patient?.image?.sizeBytes) {
      return this.formatFileSize(this.patient.image.sizeBytes);
    }

    return null;
  }

  protected buildPatientSubtitle(): string {
    if (!this.patient) {
      return '';
    }

    const species = this.patient.species?.name?.trim() || 'Sin especie registrada';
    const breed = this.patient.breed?.name?.trim() || 'Sin raza registrada';
    return `${species} - ${breed}`;
  }

  protected buildStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'RESERVADO':
        return 'Reservado';
      case 'ADOPTADO':
        return 'Adoptado';
      case 'NO_DISPONIBLE':
        return 'No disponible';
      default:
        return status?.trim() || 'Sin estado';
    }
  }

  protected buildAgeLabel(): string {
    if (!this.patient || this.patient.ageYears === null || this.patient.ageYears === undefined) {
      return 'No registrada';
    }

    return `${this.patient.ageYears} ${this.patient.ageYears === 1 ? 'ano' : 'anos'}`;
  }

  protected buildWeightLabel(): string {
    if (!this.patient || this.patient.currentWeight === null || this.patient.currentWeight === undefined) {
      return 'No registrado';
    }

    return `${this.patient.currentWeight} kg`;
  }

  protected buildBirthDateLabel(): string {
    if (!this.patient?.birthDate) {
      return 'No registrado';
    }

    return this.patient.birthDate.slice(0, 10);
  }

  protected shouldShowError(
    controlName:
      | 'contactPhone'
      | 'contactName'
      | 'contactEmail'
      | 'story'
      | 'requirements'
      | 'notes',
  ): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
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

  protected async save(): Promise<void> {
    if (this.isSaving || !this.adoption) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError = null;
      this.cdr.markForCheck();
      return;
    }

    this.submitError = null;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const rawValue = this.form.getRawValue();
      await firstValueFrom(
        this.adoptionsApi.updateBasic(this.adoption.id, {
          contactPhone: rawValue.contactPhone.trim(),
          story: this.normalizeText(rawValue.story),
          requirements: this.normalizeText(rawValue.requirements),
          notes: this.normalizeText(rawValue.notes),
          contactName: this.normalizeOptionalText(rawValue.contactName),
          contactEmail: this.normalizeOptionalText(rawValue.contactEmail),
          tagIds: this.selectedTags.map((tag) => tag.id),
          image: this.imageUpload?.file,
        }),
      );

      void this.router.navigate(['/adoption'], {
        state: {
          successMessage: `Adopcion actualizada para ${this.patient?.name ?? 'el paciente'}.`,
        },
      });
    } catch (error: unknown) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar la adopcion.',
        clientErrorMessage: 'Revisa los datos ingresados antes de continuar.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async loadData(adoptionId: number): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    try {
      const adoption = await firstValueFrom(this.adoptionsApi.get(adoptionId));
      const patient = await firstValueFrom(this.petsApi.getBasicById(adoption.patientId));

      this.adoption = adoption;
      this.patient = patient;
      this.selectedTags = adoption.tags ?? [];
      this.form.patchValue({
        contactPhone: adoption.contactPhone ?? '',
        contactName: adoption.contactName ?? '',
        contactEmail: adoption.contactEmail ?? '',
        story: adoption.story ?? '',
        requirements: adoption.requirements ?? '',
        notes: adoption.notes ?? '',
      });
    } catch {
      this.loadError = 'No se pudo cargar la adopcion.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private normalizeText(value: string): string {
    return value.trim();
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
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

function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value.length > 0 ? null : { required: true };
  };
}
