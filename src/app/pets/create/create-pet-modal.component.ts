import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
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
import { OwnersApiService } from '../../owners/api/owners-api.service';
import { ClientTutorBasicApiResponse } from '../../owners/models/client-tutor-basic.model';
import { ColorApiResponse } from '../models/color.model';
import { CreatePetRequest } from '../models/create-pet.model';
import { PetCreateResponseApiResponse } from '../models/pet-create-response.model';
import { PetImageUploadValue } from '../models/pet-image.model';
import {
  isValidPetName,
  isValidPetBirthDate,
  normalizePetText,
  PET_COLOR_MAX_LENGTH,
  parsePositivePetWeight,
  PET_MICROCHIP_MAX_LENGTH,
  PET_MAX_BIRTH_DATE,
  PET_MIN_BIRTH_DATE,
  PET_NAME_MAX_LENGTH,
  PET_TEXTAREA_MAX_LENGTH,
  PET_WEIGHT_MAX,
  PET_WEIGHT_STEP,
} from '../models/pet-form-validation.util';
import {
  SpeciesApiResponse,
  SpeciesBreedApiResponse,
} from '../models/species.model';
import { ZootecnicalGroupApiResponse } from '../models/zootecnical-group.model';
import { ColorsApiService } from '../services/colors-api.service';
import { PetImageUploadService } from '../services/pet-image-upload.service';
import { PetsApiService } from '../services/pets-api.service';
import { SpeciesApiService } from '../services/species-api.service';
import { ZootecnicalGroupsApiService } from '../services/zootecnical-groups-api.service';
import { ZootecniaCatalogApiService } from '../../catalogs/admin/api/zootecnia-catalog-api.service';
import { ZootecniaFormModalComponent, ZootecniaFormPayload } from '../../catalogs/admin/pages/zootecnia-form-modal.component';
import { BreedFormPayload } from '../../catalogs/admin/models/zootecnia-catalog.model';

type CreatePetGender = 'Macho' | 'Hembra';
type CreatePetSterilized = 'Si' | 'No';

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
  selector: 'app-create-pet-modal',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ZootecniaFormModalComponent,
  ],
  templateUrl: './create-pet-modal.component.html',
  styleUrl: './create-pet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePetModalComponent implements OnInit, OnDestroy {
  private readonly colorsApi = inject(ColorsApiService);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly petImageUploadService = inject(PetImageUploadService);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly zootecnicalGroupsApi = inject(ZootecnicalGroupsApiService);
  private readonly vaccinationAdminApi = inject(VaccinationAdminApiService);
  private readonly zootecniaCatalogApi = inject(ZootecniaCatalogApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(AppToastService);
  private readonly tutorsPageSize = 10;
  private readonly zootecnicalGroupsPageSize = 100;
  private readonly speciesPageSize = 100;
  private readonly colorsPageSize = 20;
  private tutorRequestVersion = 0;
  private speciesRequestVersion = 0;
  private vaccinationSchemeRequestVersion = 0;
  private colorRequestVersion = 0;
  private colorCreateVersion = 0;
  private tutorSearchTimer?: ReturnType<typeof setTimeout>;
  private speciesSearchTimer?: ReturnType<typeof setTimeout>;
  private colorSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingTutor = false;
  private isSelectingColor = false;

  protected readonly microchipMaxLength = PET_MICROCHIP_MAX_LENGTH;
  protected readonly colorMaxLength = PET_COLOR_MAX_LENGTH;
  protected readonly maxBirthDate = PET_MAX_BIRTH_DATE;
  protected readonly minBirthDate = PET_MIN_BIRTH_DATE;
  protected readonly nameMaxLength = PET_NAME_MAX_LENGTH;
  protected readonly textAreaMaxLength = PET_TEXTAREA_MAX_LENGTH;
  protected readonly weightMax = PET_WEIGHT_MAX;
  protected readonly weightStep = PET_WEIGHT_STEP;
  protected readonly tutorErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isTutorInvalid(),
  );
  protected readonly petNameErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isPetNameRequiredInvalid() || this.isPetNameInvalid(),
  );
  protected readonly zootecnicalGroupErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isZootecnicalGroupInvalid(),
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
  protected readonly microchipErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isMicrochipTooLong(),
  );
  protected readonly generalAllergiesErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isGeneralAllergiesTooLong(),
  );
  protected readonly generalHistoryErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isGeneralHistoryTooLong(),
  );

  protected tutorValue = '';
  protected petName = '';
  protected zootecnicalGroupValue = '';
  protected speciesValue = '';
  protected vaccinationSchemeValue = '';
  protected breedValue = '';
  protected birthDate = '';
  protected weightKg = '';
  protected colorValue = '';
  protected microchipCode = '';
  protected generalAllergies = '';
  protected generalHistory = '';
  protected sex: CreatePetGender = 'Macho';
  protected sterilized: CreatePetSterilized = 'No';

  protected selectedTutor: ClientTutorBasicApiResponse | null = null;
  protected tutors: ClientTutorBasicApiResponse[] = [];
  protected isTutorsLoading = false;
  protected zootecnicalGroups: ZootecnicalGroupApiResponse[] = [];
  protected isZootecnicalGroupsLoading = false;
  protected species: SpeciesApiResponse[] = [];
  protected isSpeciesLoading = false;
  protected vaccinationSchemes: VaccinationScheme[] = [];
  protected selectedVaccinationScheme: VaccinationScheme | null = null;
  protected isVaccinationSchemesLoading = false;
  protected selectedColor: ColorApiResponse | null = null;
  protected colors: ColorApiResponse[] = [];
  protected isColorsLoading = false;
  protected isCreatingColor = false;
  protected isSaving = false;
  protected isBreedModalOpen = false;
  protected isBreedSaving = false;
  protected breedModalError: string | null = null;
  protected breedItemToCreate: any = null;
  protected showValidationErrors = false;
  protected hasTouchedTutor = false;
  protected hasTouchedPetName = false;
  protected hasTouchedZootecnicalGroup = false;
  protected hasTouchedSpecies = false;
  protected submitError: string | null = null;
  protected colorCreateError: string | null = null;
  protected imageSelectionError: string | null = null;
  protected imageUpload: PetImageUploadValue | null = null;
  @Input() pageMode = false;
  @Input() initialTutor: ClientTutorBasicApiResponse | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<PetCreateResponseApiResponse>();

  ngOnInit(): void {
    if (this.initialTutor) {
      this.selectTutor(this.initialTutor);
    }

    void this.loadTutors('');
    void this.loadZootecnicalGroups();
    void this.loadSpecies('');
    void this.loadColors('');
  }

  ngOnDestroy(): void {
    this.clearTutorSearchTimer();
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.clearSelectedImage();
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.clearTutorSearchTimer();
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.closed.emit();
  }

  protected save(): void {
    this.showValidationErrors = true;
    this.submitError = null;

    const payload = this.buildPayload();
    if (!payload) {
      this.toast.info('Revisa los datos obligatorios de la mascota.');
      this.cdr.detectChanges();
      return;
    }

    this.clearTutorSearchTimer();
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    void this.submitCreate(payload);
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

  protected setSex(value: CreatePetGender): void {
    this.sex = value;
  }

  protected setSterilized(value: CreatePetSterilized): void {
    this.sterilized = value;
  }

  protected tutorOptions(): ClientTutorBasicApiResponse[] {
    return this.tutors;
  }

  protected selectTutor(option: ClientTutorBasicApiResponse): void {
    this.selectedTutor = option;
    this.tutorValue = this.buildTutorLabel(option);
  }

  protected onTutorChanged(value: string): void {
    this.hasTouchedTutor = true;
    this.tutorValue = value;
    this.submitError = null;
    const matchedTutor =
      this.tutors.find((item) => this.buildTutorLabel(item) === value.trim()) ?? null;

    if (this.isSelectingTutor) {
      this.isSelectingTutor = false;
      return;
    }

    this.selectedTutor = matchedTutor;
    if (matchedTutor) {
      this.clearTutorSearchTimer();
      return;
    }

    this.scheduleTutorSearch();
  }

  protected buildTutorLabel(option: ClientTutorBasicApiResponse): string {
    return `${option.firstName} ${option.lastName}`.trim();
  }

  protected buildTutorPhone(option: ClientTutorBasicApiResponse): string {
    return option.phone?.trim() || 'Sin telefono registrado';
  }

  protected onTutorOptionSelection(
    isUserInput: boolean,
    option: ClientTutorBasicApiResponse,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.isSelectingTutor = true;
    this.clearTutorSearchTimer();
    this.selectTutor(option);
  }

  protected speciesOptions(): SpeciesApiResponse[] {
    const searchTerm = this.speciesValue.trim().toLocaleLowerCase();
    const list = this.species.filter((item) => this.speciesBelongsToSelectedGroup(item));
    if (!searchTerm) {
      return list;
    }
    return list.filter((item) => item.name.toLocaleLowerCase().includes(searchTerm));
  }

  protected get speciesOptionsForModal(): any[] {
    return this.species.map((sp) => ({
      id: sp.id,
      name: sp.name,
      description: null,
      zootecnicalGroupId: sp.zootecnicalGroupId,
      createdAt: '',
      updatedAt: '',
    }));
  }

  protected zootecnicalGroupOptions(): ZootecnicalGroupApiResponse[] {
    const searchTerm = this.zootecnicalGroupValue.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return this.zootecnicalGroups;
    }

    return this.zootecnicalGroups.filter((item) =>
      item.name.toLocaleLowerCase().includes(searchTerm),
    );
  }

  protected breedOptions(): { id: number; name: string; speciesName: string }[] {
    const searchTerm = this.breedValue.trim().toLocaleLowerCase();
    let list: { id: number; name: string; speciesName: string }[] = [];

    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    if (selectedSpecies) {
      list = selectedSpecies.breeds.map((b) => ({
        id: b.id,
        name: b.name,
        speciesName: selectedSpecies.name,
      }));
    } else {
      this.species.forEach((sp) => {
        sp.breeds.forEach((b) => {
          list.push({
            id: b.id,
            name: b.name,
            speciesName: sp.name,
          });
        });
      });
    }

    if (!searchTerm) {
      return list;
    }
    return list.filter((item) => item.name.toLocaleLowerCase().includes(searchTerm));
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
    return false; // Always enabled!
  }

  protected breedPlaceholder(): string {
    return 'Buscar raza';
  }

  protected vaccinationSchemePlaceholder(): string {
    if (!this.resolveSpeciesByName(this.speciesValue)) {
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

  protected isVaccinationSchemeDisabled(): boolean {
    return (
      !this.resolveSpeciesByName(this.speciesValue)
      || this.isVaccinationSchemesLoading
      || this.vaccinationSchemes.length === 0
    );
  }

  protected hasSelectedSpecies(): boolean {
    return this.resolveSpeciesByName(this.speciesValue) !== null;
  }

  protected onZootecnicalGroupChanged(value: string): void {
    this.hasTouchedZootecnicalGroup = true;
    this.zootecnicalGroupValue = value;
    this.submitError = null;

    const selectedGroup = this.resolveZootecnicalGroupByName(value);
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    if (
      this.speciesValue.trim() &&
      (!selectedSpecies || !this.speciesBelongsToGroup(selectedSpecies, selectedGroup))
    ) {
      this.resetSpeciesSelection();
    }
  }

  protected selectZootecnicalGroup(value: string): void {
    this.zootecnicalGroupValue = value;
    this.onZootecnicalGroupChanged(value);
  }

  protected colorOptions(): ColorApiResponse[] {
    return this.colors;
  }

  protected onSpeciesChanged(value: string): void {
    this.hasTouchedSpecies = true;
    this.speciesValue = value;
    this.submitError = null;
    const matchedSpecies =
      this.species.find((item) => item.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()) ?? null;
    if (matchedSpecies) {
      if (
        this.breedValue &&
        !matchedSpecies.breeds.some((breed) => breed.name === this.breedValue)
      ) {
        this.breedValue = '';
      }

      // Auto-complete Zootecnia
      const group = this.zootecnicalGroups.find((g) => g.id === matchedSpecies.zootecnicalGroupId);
      if (group) {
        this.zootecnicalGroupValue = group.name;
      }

      void this.loadVaccinationSchemes(matchedSpecies.id);
      this.clearSpeciesSearchTimer();
      return;
    }

    this.breedValue = '';
    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
  }

  protected selectSpecies(value: string): void {
    const selected = this.species.find((item) => item.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()) ?? null;
    this.speciesValue = selected?.name ?? value;
    this.breedValue = '';
    this.submitError = null;

    if (selected) {
      // Auto-complete Zootecnia
      const group = this.zootecnicalGroups.find((g) => g.id === selected.zootecnicalGroupId);
      if (group) {
        this.zootecnicalGroupValue = group.name;
      }

      void this.loadVaccinationSchemes(selected.id);
      return;
    }

    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
  }

  protected onBreedChanged(value: string): void {
    this.breedValue = value;
    this.submitError = null;
  }

  protected selectBreed(breedName: string): void {
    this.breedValue = breedName;
    this.submitError = null;

    let foundSpecies: SpeciesApiResponse | null = null;
    let foundBreed: SpeciesBreedApiResponse | null = null;

    for (const sp of this.species) {
      const br = sp.breeds.find((b) => b.name === breedName);
      if (br) {
        foundSpecies = sp;
        foundBreed = br;
        break;
      }
    }

    if (foundSpecies && foundBreed) {
      this.speciesValue = foundSpecies.name;
      void this.loadVaccinationSchemes(foundSpecies.id);

      const group = this.zootecnicalGroups.find((g) => g.id === foundSpecies!.zootecnicalGroupId);
      if (group) {
        this.zootecnicalGroupValue = group.name;
      }
    }
  }

  protected showCreateBreedOption(): boolean {
    const value = this.breedValue.trim();
    return value.length > 0 && this.breedOptions().length === 0;
  }

  protected onBreedOptionSelection(isUserInput: boolean, breedName: string): void {
    if (!isUserInput) {
      return;
    }
    this.selectBreed(breedName);
  }

  protected onCreateBreedOptionSelection(isUserInput: boolean): void {
    if (!isUserInput) {
      return;
    }
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    this.breedItemToCreate = {
      name: this.breedValue.trim(),
      speciesId: selectedSpecies ? selectedSpecies.id : null,
    };
    this.isBreedModalOpen = true;
    this.breedModalError = null;
    this.cdr.detectChanges();
  }

  protected async onBreedCreated(payload: ZootecniaFormPayload): Promise<void> {
    this.isBreedSaving = true;
    this.breedModalError = null;
    this.cdr.detectChanges();

    try {
      const createdBreed = await firstValueFrom(
        this.zootecniaCatalogApi.createBreed(payload as BreedFormPayload),
      );

      this.toast.success('Raza creada correctamente.');

      this.speciesApi.clearCache();
      await this.loadSpecies('');

      const allSpecies = this.species;
      let foundSpecies: SpeciesApiResponse | null = null;
      for (const sp of allSpecies) {
        if (sp.id === createdBreed.speciesId) {
          foundSpecies = sp;
          break;
        }
      }

      if (foundSpecies) {
        this.speciesValue = foundSpecies.name;
        void this.loadVaccinationSchemes(foundSpecies.id);

        const group = this.zootecnicalGroups.find((g) => g.id === foundSpecies!.zootecnicalGroupId);
        if (group) {
          this.zootecnicalGroupValue = group.name;
        }
      }

      this.breedValue = createdBreed.name;
      this.isBreedModalOpen = false;
    } catch (error) {
      this.breedModalError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear la raza.',
      });
      this.toast.error(this.breedModalError);
    } finally {
      this.isBreedSaving = false;
      this.cdr.detectChanges();
    }
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
    const versionLabel = usableVersion
      ? `Version vigente ${usableVersion.version}`
      : 'Sin version vigente';
    const description = option.description?.trim();

    return description ? `${versionLabel} · ${description}` : versionLabel;
  }

  protected selectedVaccinationSchemeSupportText(): string | null {
    if (!this.selectedVaccinationScheme) {
      if (
        this.hasSelectedSpecies()
        && !this.isVaccinationSchemesLoading
        && this.vaccinationSchemes.length === 0
      ) {
        return 'No hay esquemas utilizables para esta especie. La mascota se guardará sin plan vacunal inicial.';
      }

      return null;
    }

    return this.buildVaccinationSchemeSupportText(this.selectedVaccinationScheme);
  }

  protected onPetNameChanged(value: string): void {
    this.hasTouchedPetName = true;
    this.petName = value;
    this.submitError = null;
  }

  protected markTutorTouched(): void {
    this.hasTouchedTutor = true;
  }

  protected markPetNameTouched(): void {
    this.hasTouchedPetName = true;
  }

  protected markZootecnicalGroupTouched(): void {
    this.hasTouchedZootecnicalGroup = true;
  }

  protected markSpeciesTouched(): void {
    this.hasTouchedSpecies = true;
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

  protected isTutorInvalid(): boolean {
    return (this.showValidationErrors || this.hasTouchedTutor) && !this.selectedTutor;
  }

  protected isPetNameRequiredInvalid(): boolean {
    return (this.showValidationErrors || this.hasTouchedPetName) && normalizePetText(this.petName).length === 0;
  }

  protected isPetNameTooLong(): boolean {
    return normalizePetText(this.petName).length > PET_NAME_MAX_LENGTH;
  }

  protected isPetNameInvalid(): boolean {
    const normalizedName = normalizePetText(this.petName);
    return (
      (this.showValidationErrors || this.hasTouchedPetName) &&
      this.hasTouchedPetName &&
      normalizedName.length > 0 &&
      normalizedName.length <= PET_NAME_MAX_LENGTH &&
      !isValidPetName(this.petName)
    );
  }

  protected isSpeciesInvalid(): boolean {
    return (
      (this.showValidationErrors || this.hasTouchedSpecies) &&
      !this.resolveSpeciesByName(this.speciesValue)
    );
  }

  protected isZootecnicalGroupInvalid(): boolean {
    return (
      (this.showValidationErrors || this.hasTouchedZootecnicalGroup) &&
      !this.resolveZootecnicalGroupByName(this.zootecnicalGroupValue)
    );
  }

  protected isBreedInvalid(): boolean {
    return (
      this.breedValue.trim().length > 0
      && this.resolveSpeciesByName(this.speciesValue) !== null
      && this.resolveBreedByName(this.resolveSpeciesByName(this.speciesValue), this.breedValue) === null
    );
  }

  protected isVaccinationSchemeInvalid(): boolean {
    if (!this.resolveSpeciesByName(this.speciesValue) || this.vaccinationSchemes.length === 0) {
      return false;
    }

    return !this.selectedVaccinationScheme;
  }

  protected isBirthDateInvalid(): boolean {
    return this.birthDate.trim().length > 0 && !isValidPetBirthDate(this.birthDate);
  }

  protected isColorInvalid(): boolean {
    return (
      this.colorValue.trim().length > 0 &&
      (this.colorValue.trim().length > PET_COLOR_MAX_LENGTH || !this.selectedColor)
    );
  }

  protected isWeightInvalid(): boolean {
    const rawWeight = this.normalizedWeightValue();
    return rawWeight.length > 0 && this.parseWeight() === null;
  }

  protected isMicrochipTooLong(): boolean {
    return this.microchipCode.trim().length > PET_MICROCHIP_MAX_LENGTH;
  }

  protected isGeneralAllergiesTooLong(): boolean {
    return this.generalAllergies.trim().length > PET_TEXTAREA_MAX_LENGTH;
  }

  protected isGeneralHistoryTooLong(): boolean {
    return this.generalHistory.trim().length > PET_TEXTAREA_MAX_LENGTH;
  }

  private scheduleTutorSearch(): void {
    this.clearTutorSearchTimer();
    this.tutorSearchTimer = setTimeout(() => {
      void this.loadTutors(this.tutorValue);
    }, 300);
  }

  private scheduleSpeciesSearch(): void {
    this.clearSpeciesSearchTimer();
    this.speciesSearchTimer = setTimeout(() => {
      void this.loadSpecies(this.speciesValue);
    }, 300);
  }

  private scheduleColorSearch(): void {
    this.clearColorSearchTimer();
    this.colorSearchTimer = setTimeout(() => {
      void this.loadColors(this.colorValue);
    }, 300);
  }

  private clearTutorSearchTimer(): void {
    if (this.tutorSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.tutorSearchTimer);
    this.tutorSearchTimer = undefined;
  }

  private clearSpeciesSearchTimer(): void {
    if (this.speciesSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.speciesSearchTimer);
    this.speciesSearchTimer = undefined;
  }

  private clearColorSearchTimer(): void {
    if (this.colorSearchTimer === undefined) {
      return;
    }

    clearTimeout(this.colorSearchTimer);
    this.colorSearchTimer = undefined;
  }

  private async loadTutors(search: string): Promise<void> {
    const requestToken = ++this.tutorRequestVersion;
    this.isTutorsLoading = true;
    this.tutors = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.ownersApi.listBasicTutors({
          page: 1,
          limit: this.tutorsPageSize,
          search: search.trim() || undefined,
        }),
      );

      if (requestToken !== this.tutorRequestVersion) {
        return;
      }

      this.tutors = response;
      if (this.selectedTutor) {
        this.selectedTutor =
          response.find((item) => item.id === this.selectedTutor?.id) ?? this.selectedTutor;
      }
    } catch {
      if (requestToken !== this.tutorRequestVersion) {
        return;
      }

      this.tutors = [];
    } finally {
      if (requestToken !== this.tutorRequestVersion) {
        return;
      }

      this.isTutorsLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadZootecnicalGroups(): Promise<void> {
    this.isZootecnicalGroupsLoading = true;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.zootecnicalGroupsApi.list({
          page: 1,
          limit: this.zootecnicalGroupsPageSize,
        }),
      );

      this.zootecnicalGroups = response.data;
    } catch {
      this.zootecnicalGroups = [];
    } finally {
      this.isZootecnicalGroupsLoading = false;
      this.cdr.detectChanges();
    }
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
          limit: 1000,
          search: '',
        }),
      );

      if (requestToken !== this.speciesRequestVersion) {
        return;
      }

      this.species = response.data;

      const matchedSpecies = this.resolveSpeciesByName(this.speciesValue);
      if (matchedSpecies) {
        void this.loadVaccinationSchemes(matchedSpecies.id);
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

  private async loadVaccinationSchemes(speciesId: number): Promise<void> {
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

      if (this.vaccinationSchemes.length > 0) {
        this.selectVaccinationScheme(this.vaccinationSchemes[0]);
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

  private resetVaccinationSchemes(): void {
    this.vaccinationSchemes = [];
    this.selectedVaccinationScheme = null;
    this.vaccinationSchemeValue = '';
  }

  private cancelVaccinationSchemeRequests(): void {
    this.vaccinationSchemeRequestVersion += 1;
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

  private resolveSpeciesByName(name: string): SpeciesApiResponse | null {
    const normalizedName = name.trim().toLocaleLowerCase();
    if (!normalizedName) {
      return null;
    }

    return this.species.find((item) => item.name.toLocaleLowerCase() === normalizedName) ?? null;
  }

  protected resolveZootecnicalGroupByName(name: string): ZootecnicalGroupApiResponse | null {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return null;
    }

    return this.zootecnicalGroups.find((item) => item.name === normalizedName) ?? null;
  }

  private speciesBelongsToSelectedGroup(species: SpeciesApiResponse): boolean {
    return this.speciesBelongsToGroup(
      species,
      this.resolveZootecnicalGroupByName(this.zootecnicalGroupValue),
    );
  }

  private speciesBelongsToGroup(
    species: SpeciesApiResponse,
    group: ZootecnicalGroupApiResponse | null,
  ): boolean {
    return !group || species.zootecnicalGroupId === group.id;
  }

  private resetSpeciesSelection(): void {
    this.speciesValue = '';
    this.breedValue = '';
    this.cancelVaccinationSchemeRequests();
    this.resetVaccinationSchemes();
  }

  private resolveBreedByName(
    species: SpeciesApiResponse | null,
    breedName: string,
  ): SpeciesBreedApiResponse | null {
    const normalizedBreedName = breedName.trim();
    if (!species || !normalizedBreedName) {
      return null;
    }

    return species.breeds.find((item) => item.name === normalizedBreedName) ?? null;
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
          response.data.find((item) => item.id === this.selectedColor?.id) ?? this.selectedColor;
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
      const created = await firstValueFrom(
        this.colorsApi.create({ name: trimmedName }),
      );

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

  private buildPayload(): CreatePetRequest | null {
    const name = normalizePetText(this.petName);
    const microchipCode = normalizePetText(this.microchipCode);
    const rawWeight = this.normalizedWeightValue();
    const currentWeight = this.parseWeight();
    const selectedZootecnicalGroup = this.resolveZootecnicalGroupByName(this.zootecnicalGroupValue);
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    const selectedBreed = this.resolveBreedByName(selectedSpecies, this.breedValue);
    const birthDate = this.birthDate.trim();
    const generalAllergies = normalizePetText(this.generalAllergies);
    const generalHistory = normalizePetText(this.generalHistory);
    const colorValue = normalizePetText(this.colorValue);
    const hasAvailableVaccinationSchemes = this.vaccinationSchemes.length > 0;

    if (
      !this.selectedTutor ||
      !isValidPetName(name) ||
      !selectedZootecnicalGroup ||
      !selectedSpecies ||
      this.isVaccinationSchemesLoading ||
      (hasAvailableVaccinationSchemes && !this.selectedVaccinationScheme) ||
      !isValidPetBirthDate(birthDate) ||
      (rawWeight.length > 0 && currentWeight === null) ||
      microchipCode.length > PET_MICROCHIP_MAX_LENGTH ||
      (this.breedValue.trim().length > 0 && !selectedBreed) ||
      (colorValue.length > 0 && (colorValue.length > PET_COLOR_MAX_LENGTH || !this.selectedColor)) ||
      generalAllergies.length > PET_TEXTAREA_MAX_LENGTH ||
      generalHistory.length > PET_TEXTAREA_MAX_LENGTH
    ) {
      return null;
    }

    const payload: CreatePetRequest = {
      clientId: this.selectedTutor.id,
      name,
      zootecnicalGroupId: selectedZootecnicalGroup.id,
      speciesId: selectedSpecies.id,
      sex: this.sex === 'Hembra' ? 'HEMBRA' : 'MACHO',
    };

    if (this.selectedVaccinationScheme) {
      payload.vaccinationSchemeId = this.selectedVaccinationScheme.id;
    }

    if (selectedBreed) {
      payload.breedId = selectedBreed.id;
    }

    if (this.selectedColor) {
      payload.colorId = this.selectedColor.id;
    }

    payload.sterilized = this.sterilized === 'Si';

    if (microchipCode) {
      payload.microchipCode = microchipCode;
    }

    if (birthDate) {
      payload.birthDate = birthDate;
    }

    if (currentWeight !== null) {
      payload.currentWeight = currentWeight;
    }

    if (generalAllergies) {
      payload.generalAllergies = generalAllergies;
    }

    if (generalHistory) {
      payload.generalHistory = generalHistory;
    }

    if (this.imageUpload) {
      payload.image = this.imageUpload.file;
    }

    return payload;
  }

  private parseWeight(): number | null {
    return parsePositivePetWeight(this.normalizedWeightValue());
  }

  private normalizedWeightValue(): string {
    return this.weightKg === null || this.weightKg === undefined
      ? ''
      : String(this.weightKg).trim();
  }

  private async submitCreate(payload: CreatePetRequest): Promise<void> {
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      const createdPet = await firstValueFrom(this.petsApi.create(payload));
      this.toast.success('Mascota registrada correctamente.');
      this.saved.emit(createdPet);
    } catch (error: unknown) {
      this.submitError = this.resolveCreateErrorMessage(error);
      this.toast.error(this.submitError);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private resolveCreateErrorMessage(error: unknown): string {
    return resolveApiErrorMessage(error, {
      defaultMessage: 'No se pudo guardar la mascota.',
      clientErrorMessage: 'Revisa los datos ingresados.',
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
