import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { VaccinationAdminApiService } from '@app/vaccination/admin/api/vaccination-admin-api.service';
import {
  VaccinationScheme,
  VaccinationSchemeVersion,
} from '@app/vaccination/admin/models/vaccination-admin.model';
import { ColorApiResponse } from '../models/color.model';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
import { PetImageUploadValue } from '../models/pet-image.model';
import {
  isValidPetName,
  isValidPetBirthDate,
  normalizePetText,
  PET_COLOR_MAX_LENGTH,
  PET_MAX_BIRTH_DATE,
  PET_MIN_BIRTH_DATE,
  parsePositivePetWeight,
  PET_NAME_MAX_LENGTH,
  PET_TEXTAREA_MAX_LENGTH,
  PET_WEIGHT_MAX,
  PET_WEIGHT_STEP,
} from '../models/pet-form-validation.util';
import {
  SpeciesApiResponse,
  SpeciesBreedApiResponse,
} from '../models/species.model';
import { UpdatePetBasicRequest } from '../models/update-pet-basic.model';
import { PatientVaccinationApiService } from '../vaccination/services/patient-vaccination-api.service';
import { ColorsApiService } from '../services/colors-api.service';
import { PetImageUploadService } from '../services/pet-image-upload.service';
import { PetsApiService } from '../services/pets-api.service';
import { SpeciesApiService } from '../services/species-api.service';

type EditPetGender = 'Macho' | 'Hembra';
type EditPetSterilized = 'Si' | 'No';

class ManualFieldErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(
    _control: FormControl | null,
    _form: FormGroupDirective | NgForm | null,
  ): boolean {
    return this.hasError();
  }
}

@Component({
  selector: 'app-edit-pet-modal',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './edit-pet-modal.component.html',
  styleUrl: './edit-pet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPetModalComponent implements OnDestroy {
  private readonly colorsApi = inject(ColorsApiService);
  private readonly petImageUploadService = inject(PetImageUploadService);
  private readonly petsApi = inject(PetsApiService);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly vaccinationAdminApi = inject(VaccinationAdminApiService);
  private readonly patientVaccinationApi = inject(PatientVaccinationApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(AppToastService);
  private readonly speciesPageSize = 20;
  private readonly colorsPageSize = 20;
  private speciesRequestVersion = 0;
  private vaccinationSchemeRequestVersion = 0;
  private colorRequestVersion = 0;
  private colorCreateVersion = 0;
  private speciesSearchTimer?: ReturnType<typeof setTimeout>;
  private colorSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingColor = false;
  private _pet!: PetBasicDetailApiResponse;

  protected readonly nameMaxLength = PET_NAME_MAX_LENGTH;
  protected readonly colorMaxLength = PET_COLOR_MAX_LENGTH;
  protected readonly maxBirthDate = PET_MAX_BIRTH_DATE;
  protected readonly minBirthDate = PET_MIN_BIRTH_DATE;
  protected readonly textAreaMaxLength = PET_TEXTAREA_MAX_LENGTH;
  protected readonly weightMax = PET_WEIGHT_MAX;
  protected readonly weightStep = PET_WEIGHT_STEP;
  protected readonly nameErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isNameRequiredInvalid() || this.isNameInvalid(),
  );
  protected readonly speciesErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isSpeciesInvalid(),
  );
  protected readonly vaccinationSchemeErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isVaccinationSchemeInvalid(),
  );
  protected readonly breedErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isBreedInvalid(),
  );
  protected readonly birthDateErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isBirthDateInvalid(),
  );
  protected readonly weightErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isWeightInvalid(),
  );
  protected readonly colorErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    !!this.colorCreateError || this.isColorInvalid(),
  );
  protected readonly generalAllergiesErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isGeneralAllergiesTooLong(),
  );
  protected readonly generalHistoryErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isGeneralHistoryTooLong(),
  );

  protected name = '';
  protected speciesValue = '';
  protected vaccinationSchemeValue = '';
  protected breedId: number | null = null;
  protected birthDate = '';
  protected weightKg = '';
  protected colorValue = '';
  protected generalAllergies = '';
  protected generalHistory = '';
  protected editGender: EditPetGender = 'Macho';
  protected editSterilized: EditPetSterilized = 'No';
  protected species: SpeciesApiResponse[] = [];
  protected isSpeciesLoading = false;
  protected vaccinationSchemes: VaccinationScheme[] = [];
  protected selectedVaccinationScheme: VaccinationScheme | null = null;
  protected isVaccinationSchemesLoading = false;
  protected currentVaccinationSchemeId: number | null = null;
  protected vaccinationPlanLoadError: string | null = null;
  protected colors: ColorApiResponse[] = [];
  protected selectedColor: ColorApiResponse | null = null;
  protected isColorsLoading = false;
  protected isCreatingColor = false;
  protected isSaving = false;
  protected showValidationErrors = false;
  protected hasTouchedName = false;
  protected hasTouchedSpecies = false;
  protected submitError: string | null = null;
  protected colorCreateError: string | null = null;
  protected imageSelectionError: string | null = null;
  protected imageUpload: PetImageUploadValue | null = null;
  @Input() pageMode = false;

  @Input({ required: true })
  set pet(value: PetBasicDetailApiResponse) {
    this._pet = value;
    this.name = value.name ?? '';
    this.speciesValue = value.species?.name ?? '';
    this.breedId = value.breed?.id ?? null;
    this.birthDate = value.birthDate?.slice(0, 10) ?? '';
    this.weightKg =
      value.currentWeight === null || value.currentWeight === undefined
        ? ''
        : String(value.currentWeight);
    this.colorValue = value.color?.name ?? '';
    this.generalAllergies = value.generalAllergies ?? '';
    this.generalHistory = value.generalHistory ?? '';
    this.selectedColor = value.color
      ? {
          id: value.color.id,
          name: value.color.name,
          hexCode: null,
          createdAt: '',
          updatedAt: '',
        }
      : null;
    this.editGender =
      (value.sex ?? '').trim().toUpperCase() === 'HEMBRA' ? 'Hembra' : 'Macho';
    this.editSterilized = value.sterilized === true ? 'Si' : 'No';
    this.showValidationErrors = false;
    this.hasTouchedName = false;
    this.hasTouchedSpecies = false;
    this.submitError = null;
    this.colorCreateError = null;
    this.vaccinationPlanLoadError = null;
    this.imageSelectionError = null;
    this.clearSelectedImage();
    void this.loadSpecies(this.speciesValue);
    void this.loadVaccinationPlanContext(value.id, value.species?.id ?? null);
    void this.loadColors(this.colorValue);
  }

  get pet(): PetBasicDetailApiResponse {
    return this._pet;
  }

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  ngOnDestroy(): void {
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.clearSelectedImage();
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.closed.emit();
  }

  protected async save(): Promise<void> {
    this.showValidationErrors = true;
    this.submitError = null;
    const payload = this.buildPayload();

    if (!payload) {
      this.toast.info('Revisa los datos obligatorios de la mascota.');
      this.cdr.detectChanges();
      return;
    }

    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.isSaving = true;
    this.cdr.detectChanges();

    let basicUpdateCompleted = false;

    try {
      await firstValueFrom(this.petsApi.updateBasic(this.pet.id, payload));
      basicUpdateCompleted = true;
      await this.applyVaccinationSchemeChangeIfNeeded(payload.speciesId);
      this.toast.success('Mascota actualizada correctamente.');
      this.saved.emit();
    } catch (error: unknown) {
      this.submitError = basicUpdateCompleted
        ? this.resolveVaccinationSchemeOperationError(error)
        : this.resolveErrorMessage(error);
      this.toast.error(this.submitError);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
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
      this.cdr.detectChanges();
    }
  }

  protected clearImageSelection(fileInput?: HTMLInputElement): void {
    this.imageSelectionError = null;
    this.clearSelectedImage();

    if (fileInput) {
      fileInput.value = '';
    }

    this.cdr.detectChanges();
  }

  protected currentImageUrl(): string | null {
    return this.imageUpload?.previewUrl ?? this.pet.image?.url ?? null;
  }

  protected currentImageName(): string | null {
    return this.imageUpload?.file.name ?? this.pet.image?.originalName ?? null;
  }

  protected currentImageSizeLabel(): string | null {
    const sizeBytes = this.imageUpload?.file.size ?? this.pet.image?.sizeBytes ?? null;
    return sizeBytes ? this.formatFileSize(sizeBytes) : null;
  }

  protected hasSelectedReplacementImage(): boolean {
    return this.imageUpload !== null;
  }

  protected setGender(value: EditPetGender): void {
    this.editGender = value;
    this.submitError = null;
  }

  protected setSterilized(value: EditPetSterilized): void {
    this.editSterilized = value;
    this.submitError = null;
  }

  protected speciesOptions(): SpeciesApiResponse[] {
    return this.species;
  }

  protected breedOptions(): SpeciesBreedApiResponse[] {
    return this.resolveSpeciesByName(this.speciesValue)?.breeds ?? [];
  }

  protected vaccinationSchemeOptions(): VaccinationScheme[] {
    const searchTerm = this.vaccinationSchemeValue.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return this.vaccinationSchemes;
    }

    return this.vaccinationSchemes.filter((scheme) => {
      const description = scheme.description?.toLocaleLowerCase() ?? '';
      const version = this.resolveUsableSchemeVersion(scheme);

      return (
        scheme.name.toLocaleLowerCase().includes(searchTerm)
        || description.includes(searchTerm)
        || String(version?.version ?? '').includes(searchTerm)
      );
    });
  }

  protected isBreedDisabled(): boolean {
    return this.breedOptions().length === 0;
  }

  protected breedPlaceholder(): string {
    if (!this.speciesValue.trim()) {
      return 'Selecciona una especie primero';
    }

    return this.breedOptions().length > 0
      ? 'Selecciona una raza'
      : 'Sin razas disponibles';
  }

  protected vaccinationSchemePlaceholder(): string {
    if (!this.hasSelectedSpecies()) {
      return 'Selecciona una especie primero';
    }

    if (this.isVaccinationSchemesLoading) {
      return 'Buscando esquemas...';
    }

    if (this.vaccinationSchemes.length === 0) {
      return 'No hay esquemas utilizables para esta especie';
    }

    return 'Buscar esquema vacunal';
  }

  protected hasSelectedSpecies(): boolean {
    return this.resolveSpeciesByName(this.speciesValue) !== null;
  }

  protected isVaccinationSchemeDisabled(): boolean {
    return (
      !this.hasSelectedSpecies()
      || this.isVaccinationSchemesLoading
      || this.vaccinationSchemes.length === 0
    );
  }

  protected onSpeciesChanged(value: string): void {
    this.hasTouchedSpecies = true;
    this.speciesValue = value;
    this.submitError = null;
    const matchedSpecies =
      this.species.find((item) => item.name === value.trim()) ?? null;

    if (matchedSpecies) {
      if (
        this.breedId !== null &&
        !matchedSpecies.breeds.some((breed) => breed.id === this.breedId)
      ) {
        this.breedId = null;
      }

      void this.loadVaccinationSchemes(
        matchedSpecies.id,
        this.preferredVaccinationSchemeIdForSpecies(matchedSpecies.id),
      );
      this.clearSpeciesSearchTimer();
      return;
    }

    this.breedId = null;
    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
    this.scheduleSpeciesSearch();
  }

  protected selectSpecies(value: string): void {
    const selected = this.species.find((item) => item.name === value) ?? null;
    this.speciesValue = selected?.name ?? value;
    this.submitError = null;

    if (
      this.breedId !== null &&
      selected &&
      !selected.breeds.some((breed) => breed.id === this.breedId)
    ) {
      this.breedId = null;
    }

    if (selected) {
      void this.loadVaccinationSchemes(
        selected.id,
        this.preferredVaccinationSchemeIdForSpecies(selected.id),
      );
      return;
    }

    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
  }

  protected onVaccinationSchemeChanged(value: string): void {
    this.vaccinationSchemeValue = value;
    this.submitError = null;
    this.selectedVaccinationScheme =
      this.vaccinationSchemes.find((scheme) => this.buildVaccinationSchemeLabel(scheme) === value.trim()) ?? null;
  }

  protected onVaccinationSchemeOptionSelection(
    isUserInput: boolean,
    option: VaccinationScheme,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.selectVaccinationScheme(option);
  }

  protected buildVaccinationSchemeLabel(option: VaccinationScheme): string {
    return option.name;
  }

  protected buildVaccinationSchemeSupportText(option: VaccinationScheme): string {
    const usableVersion = this.resolveUsableSchemeVersion(option);
    const versionLabel = usableVersion ? `Version vigente ${usableVersion.version}` : 'Sin version vigente';
    const description = option.description?.trim();
    const currentMarker = option.id === this.currentVaccinationSchemeId ? 'Plan actual · ' : '';
    const base = description ? `${versionLabel} · ${description}` : versionLabel;

    return `${currentMarker}${base}`;
  }

  protected selectedVaccinationSchemeSupportText(): string | null {
    if (!this.selectedVaccinationScheme) {
      return null;
    }

    return this.buildVaccinationSchemeSupportText(this.selectedVaccinationScheme);
  }

  protected colorOptions(): ColorApiResponse[] {
    return this.colors;
  }

  protected onNameChanged(value: string): void {
    this.hasTouchedName = true;
    this.name = value;
    this.submitError = null;
  }

  protected markNameTouched(): void {
    this.hasTouchedName = true;
  }

  protected markSpeciesTouched(): void {
    this.hasTouchedSpecies = true;
  }

  protected onBreedChanged(value: number | null): void {
    this.breedId = value;
    this.submitError = null;
  }

  protected onBirthDateChanged(value: string): void {
    this.birthDate = value;
    this.submitError = null;
  }

  protected onWeightChanged(value: string): void {
    this.weightKg = value;
    this.submitError = null;
  }

  protected onColorChanged(value: string): void {
    this.colorValue = value;
    this.submitError = null;
    this.colorCreateError = null;
    this.selectedColor =
      this.colors.find((option) => option.name === value.trim()) ?? null;

    if (this.isSelectingColor) {
      this.isSelectingColor = false;
      return;
    }

    this.scheduleColorSearch();
  }

  protected onGeneralAllergiesChanged(value: string): void {
    this.generalAllergies = value;
    this.submitError = null;
  }

  protected onGeneralHistoryChanged(value: string): void {
    this.generalHistory = value;
    this.submitError = null;
  }

  protected selectColor(value: string): void {
    this.colorValue = value;
    this.selectedColor =
      this.colors.find((option) => option.name === value.trim()) ?? null;
  }

  protected showCreateColorOption(): boolean {
    const value = this.colorValue.trim();
    return value.length > 0 && !this.isColorsLoading && this.colors.length === 0;
  }

  protected onColorOptionSelection(
    isUserInput: boolean,
    option: ColorApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingColor = true;
    this.clearColorSearchTimer();
    this.selectColor(option.name);
  }

  protected onCreateColorOptionSelection(isUserInput: boolean): void {
    if (!isUserInput) {
      return;
    }

    void this.createColor(this.colorValue.trim());
  }

  protected isNameRequiredInvalid(): boolean {
    return (this.showValidationErrors || this.hasTouchedName) && normalizePetText(this.name).length === 0;
  }

  protected isNameTooLong(): boolean {
    return normalizePetText(this.name).length > PET_NAME_MAX_LENGTH;
  }

  protected isNameInvalid(): boolean {
    const normalizedName = normalizePetText(this.name);
    return (
      (this.showValidationErrors || this.hasTouchedName) &&
      normalizedName.length > 0 &&
      normalizedName.length <= PET_NAME_MAX_LENGTH &&
      !isValidPetName(this.name)
    );
  }

  protected isSpeciesInvalid(): boolean {
    return (
      (this.showValidationErrors || this.hasTouchedSpecies) &&
      !this.resolveSpeciesByName(this.speciesValue)
    );
  }

  protected isBreedInvalid(): boolean {
    return (
      this.breedId !== null &&
      this.resolveSpeciesByName(this.speciesValue) !== null &&
      this.resolveBreedById(this.resolveSpeciesByName(this.speciesValue), this.breedId) === null
    );
  }

  protected isVaccinationSchemeInvalid(): boolean {
    if (!this.hasSelectedSpecies() || this.vaccinationSchemes.length === 0 || this.vaccinationPlanLoadError) {
      return false;
    }

    return !this.selectedVaccinationScheme;
  }

  protected isBirthDateInvalid(): boolean {
    return this.birthDate.trim().length > 0 && !isValidPetBirthDate(this.birthDate);
  }

  protected isWeightInvalid(): boolean {
    const rawWeight = this.normalizedWeightValue();
    return (
      rawWeight.length > 0 &&
      this.parseWeight() === null
    );
  }

  protected isColorInvalid(): boolean {
    return (
      this.colorValue.trim().length > 0 &&
      (this.colorValue.trim().length > PET_COLOR_MAX_LENGTH || !this.selectedColor)
    );
  }

  protected isGeneralAllergiesTooLong(): boolean {
    return this.generalAllergies.trim().length > PET_TEXTAREA_MAX_LENGTH;
  }

  protected isGeneralHistoryTooLong(): boolean {
    return this.generalHistory.trim().length > PET_TEXTAREA_MAX_LENGTH;
  }

  private scheduleSpeciesSearch(): void {
    this.clearSpeciesSearchTimer();
    this.speciesSearchTimer = setTimeout(() => {
      void this.loadSpecies(this.speciesValue);
    }, 300);
  }

  private clearSpeciesSearchTimer(): void {
    if (this.speciesSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.speciesSearchTimer);
    this.speciesSearchTimer = undefined;
  }

  private scheduleColorSearch(): void {
    this.clearColorSearchTimer();
    this.colorSearchTimer = setTimeout(() => {
      void this.loadColors(this.colorValue);
    }, 300);
  }

  private clearColorSearchTimer(): void {
    if (this.colorSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.colorSearchTimer);
    this.colorSearchTimer = undefined;
  }

  private async loadSpecies(search: string): Promise<void> {
    const requestToken = ++this.speciesRequestVersion;
    this.isSpeciesLoading = true;
    this.species = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.speciesApi.list({
          page: 1,
          limit: this.speciesPageSize,
          search: search.trim() || undefined,
        }),
      );

      if (requestToken !== this.speciesRequestVersion) {
        return;
      }

      this.species = response.data;

      const matchedSpecies = this.resolveSpeciesByName(this.speciesValue);
      if (
        this.breedId !== null &&
        matchedSpecies &&
        !matchedSpecies.breeds.some((breed) => breed.id === this.breedId)
      ) {
        this.breedId = null;
      }

      if (matchedSpecies) {
        void this.loadVaccinationSchemes(
          matchedSpecies.id,
          this.preferredVaccinationSchemeIdForSpecies(matchedSpecies.id),
        );
      } else {
        this.cancelVaccinationSchemeRequests();
        this.resetVaccinationSchemes();
      }
    } catch {
      if (requestToken !== this.speciesRequestVersion) {
        return;
      }

      this.species = [];
      this.cancelVaccinationSchemeRequests();
      this.resetVaccinationSchemes();
    } finally {
      if (requestToken !== this.speciesRequestVersion) {
        return;
      }

      this.isSpeciesLoading = false;
      this.cdr.detectChanges();
    }
  }

  private resolveSpeciesByName(name: string): SpeciesApiResponse | null {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return null;
    }

    return this.species.find((item) => item.name === normalizedName) ?? null;
  }

  private resolveBreedById(
    species: SpeciesApiResponse | null,
    breedId: number | null,
  ): SpeciesBreedApiResponse | null {
    if (!species || breedId === null) {
      return null;
    }

    return species.breeds.find((item) => item.id === breedId) ?? null;
  }

  private async loadVaccinationPlanContext(
    patientId: number,
    speciesId: number | null,
  ): Promise<void> {
    this.vaccinationPlanLoadError = null;
    this.currentVaccinationSchemeId = null;
    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
    this.cdr.detectChanges();

    try {
      const plan = await firstValueFrom(this.patientVaccinationApi.getPatientPlan(patientId));
      this.currentVaccinationSchemeId = plan.scheme.id;

      if (speciesId) {
        await this.loadVaccinationSchemes(speciesId, plan.scheme.id);
      }
    } catch (error: unknown) {
      this.vaccinationPlanLoadError = this.resolveVaccinationPlanLoadMessage(error);

      if (speciesId) {
        await this.loadVaccinationSchemes(speciesId);
      } else {
        this.cdr.detectChanges();
      }
    }
  }

  private async loadVaccinationSchemes(
    speciesId: number,
    preferredSchemeId?: number | null,
  ): Promise<void> {
    const requestToken = ++this.vaccinationSchemeRequestVersion;
    this.isVaccinationSchemesLoading = true;
    this.resetVaccinationSchemes();
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.vaccinationAdminApi.listSchemes(speciesId));

      if (requestToken !== this.vaccinationSchemeRequestVersion) {
        return;
      }

      this.vaccinationSchemes = response
        .filter((scheme) => scheme.species.id === speciesId && this.resolveUsableSchemeVersion(scheme) !== null)
        .sort((left, right) => left.name.localeCompare(right.name));

      const preferred =
        (preferredSchemeId
          ? this.vaccinationSchemes.find((scheme) => scheme.id === preferredSchemeId) ?? null
          : null)
        ?? this.vaccinationSchemes[0]
        ?? null;

      if (preferred) {
        this.selectVaccinationScheme(preferred);
      }
    } catch {
      if (requestToken !== this.vaccinationSchemeRequestVersion) {
        return;
      }

      this.resetVaccinationSchemes();
    } finally {
      if (requestToken !== this.vaccinationSchemeRequestVersion) {
        return;
      }

      this.isVaccinationSchemesLoading = false;
      this.cdr.detectChanges();
    }
  }

  private cancelVaccinationSchemeRequests(): void {
    this.vaccinationSchemeRequestVersion += 1;
  }

  private resetVaccinationSchemes(): void {
    this.vaccinationSchemes = [];
    this.selectedVaccinationScheme = null;
    this.vaccinationSchemeValue = '';
    this.isVaccinationSchemesLoading = false;
  }

  private preferredVaccinationSchemeIdForSpecies(speciesId: number): number | null {
    if (
      this.selectedVaccinationScheme
      && this.selectedVaccinationScheme.species.id === speciesId
    ) {
      return this.selectedVaccinationScheme.id;
    }

    if (this.pet?.species?.id === speciesId) {
      return this.currentVaccinationSchemeId;
    }

    return null;
  }

  private selectVaccinationScheme(option: VaccinationScheme): void {
    this.selectedVaccinationScheme = option;
    this.vaccinationSchemeValue = this.buildVaccinationSchemeLabel(option);
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

  private async loadColors(search: string): Promise<void> {
    const requestToken = ++this.colorRequestVersion;
    this.isColorsLoading = true;
    this.colorCreateError = null;
    this.colors = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.colorsApi.list({
          page: 1,
          limit: this.colorsPageSize,
          search: search.trim() || undefined,
        }),
      );

      if (requestToken !== this.colorRequestVersion) {
        return;
      }

      this.colors = response.data;
      if (this.selectedColor) {
        this.selectedColor =
          response.data.find((item) => item.id === this.selectedColor?.id) ??
          this.selectedColor;
      }
    } catch {
      if (requestToken !== this.colorRequestVersion) {
        return;
      }

      this.colors = [];
    } finally {
      if (requestToken !== this.colorRequestVersion) {
        return;
      }

      this.isColorsLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async createColor(name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName || this.isCreatingColor) {
      return;
    }

    const requestToken = ++this.colorCreateVersion;
    this.isCreatingColor = true;
    this.colorCreateError = null;
    this.clearColorSearchTimer();
    this.cdr.detectChanges();

    try {
      const created = await firstValueFrom(this.colorsApi.create({ name: trimmedName }));

      if (requestToken !== this.colorCreateVersion) {
        return;
      }

      this.colorValue = created.name;
      this.selectedColor = created;
      this.colors = [created];
    } catch {
      if (requestToken !== this.colorCreateVersion) {
        return;
      }

      this.colorCreateError = 'No se pudo crear el color.';
    } finally {
      if (requestToken !== this.colorCreateVersion) {
        return;
      }

      this.isCreatingColor = false;
      this.cdr.detectChanges();
    }
  }

  private buildPayload(): UpdatePetBasicRequest | null {
    const name = normalizePetText(this.name);
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    const selectedBreed = this.resolveBreedById(selectedSpecies, this.breedId);
    const currentWeight = this.parseWeight();
    const birthDate = this.birthDate.trim();
    const generalAllergies = normalizePetText(this.generalAllergies);
    const generalHistory = normalizePetText(this.generalHistory);
    const colorValue = normalizePetText(this.colorValue);

    if (
      !isValidPetName(name) ||
      !selectedSpecies ||
      !isValidPetBirthDate(birthDate) ||
      (this.breedId !== null && !selectedBreed) ||
      (colorValue.length > 0 && (colorValue.length > PET_COLOR_MAX_LENGTH || !this.selectedColor)) ||
      (this.normalizedWeightValue().length > 0 && currentWeight === null) ||
      generalAllergies.length > PET_TEXTAREA_MAX_LENGTH ||
      generalHistory.length > PET_TEXTAREA_MAX_LENGTH
    ) {
      return null;
    }

    const payload: UpdatePetBasicRequest = {
      name,
      speciesId: selectedSpecies.id,
      sex: this.editGender === 'Hembra' ? 'HEMBRA' : 'MACHO',
      sterilized: this.editSterilized === 'Si',
      generalAllergies,
      generalHistory,
    };

    if (selectedBreed) {
      payload.breedId = selectedBreed.id;
    }

    if (birthDate) {
      payload.birthDate = birthDate;
    }

    if (currentWeight !== null) {
      payload.currentWeight = currentWeight;
    }

    if (this.selectedColor) {
      payload.colorId = this.selectedColor.id;
    }

    if (this.imageUpload) {
      payload.image = this.imageUpload.file;
    }

    return payload;
  }

  private async applyVaccinationSchemeChangeIfNeeded(targetSpeciesId: number): Promise<void> {
    if (!this.selectedVaccinationScheme || this.vaccinationPlanLoadError) {
      return;
    }

    const originalSpeciesId = this.pet.species?.id ?? null;
    const shouldChangeScheme =
      this.selectedVaccinationScheme.id !== this.currentVaccinationSchemeId
      || targetSpeciesId !== originalSpeciesId;

    if (!shouldChangeScheme) {
      return;
    }

    await firstValueFrom(
      this.patientVaccinationApi.changePatientVaccinationScheme(this.pet.id, {
        mode: 'CHANGE_SCHEME',
        vaccinationSchemeId: this.selectedVaccinationScheme.id,
        notes: 'Cambio de esquema solicitado desde la edición de mascota.',
      }),
    );
  }

  private parseWeight(): number | null {
    return parsePositivePetWeight(this.normalizedWeightValue());
  }

  private normalizedWeightValue(): string {
    return this.weightKg === null || this.weightKg === undefined
      ? ''
      : String(this.weightKg).trim();
  }

  private resolveErrorMessage(error: unknown): string {
    return resolveApiErrorMessage(error, {
      defaultMessage: 'No se pudo actualizar la mascota.',
    });
  }

  private resolveVaccinationPlanLoadMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse
      && error.status === 404
      && resolveApiErrorMessage(error, { defaultMessage: '' })
        .toLowerCase()
        .includes('no tiene plan vacunal generado')
    ) {
      return 'La mascota aún no tiene plan vacunal generado.';
    }

    return 'No se pudo cargar el plan vacunal actual de la mascota.';
  }

  private resolveVaccinationSchemeOperationError(error: unknown): string {
    const message = resolveApiErrorMessage(error, {
      defaultMessage:
        'Los datos básicos de la mascota se actualizaron, pero no se pudo cambiar el esquema vacunal.',
    });
    const normalized = message.toLowerCase();

    if (normalized.includes('null value in column "vaccine_id"') || normalized.includes('vaccine_id')) {
      return 'Los datos básicos de la mascota se actualizaron, pero el esquema seleccionado tiene una o más dosis sin vacuna asociada. Revisa la versión vigente del esquema antes de asignarlo.';
    }

    return message;
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
