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
import { FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { ColorApiResponse } from '../models/color.model';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
import {
  isValidPetBirthDate,
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
import { ColorsApiService } from '../services/colors-api.service';
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
  private readonly petsApi = inject(PetsApiService);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly speciesPageSize = 20;
  private readonly colorsPageSize = 20;
  private speciesRequestVersion = 0;
  private colorRequestVersion = 0;
  private colorCreateVersion = 0;
  private speciesSearchTimer?: ReturnType<typeof setTimeout>;
  private colorSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingColor = false;
  private _pet!: PetBasicDetailApiResponse;

  protected readonly nameMaxLength = PET_NAME_MAX_LENGTH;
  protected readonly textAreaMaxLength = PET_TEXTAREA_MAX_LENGTH;
  protected readonly weightMax = PET_WEIGHT_MAX;
  protected readonly weightStep = PET_WEIGHT_STEP;
  protected readonly nameErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isNameRequiredInvalid() || this.isNameTooLong(),
  );
  protected readonly speciesErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isSpeciesInvalid(),
  );
  protected readonly breedErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isBreedInvalid(),
  );
  protected readonly birthDateErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isBirthDateInvalid(),
  );
  protected readonly weightErrorStateMatcher = new ManualFieldErrorStateMatcher(() =>
    this.isWeightRequiredInvalid() || this.isWeightInvalid(),
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
  protected colors: ColorApiResponse[] = [];
  protected selectedColor: ColorApiResponse | null = null;
  protected isColorsLoading = false;
  protected isCreatingColor = false;
  protected isSaving = false;
  protected showValidationErrors = false;
  protected submitError: string | null = null;
  protected colorCreateError: string | null = null;

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
    this.submitError = null;
    this.colorCreateError = null;
    void this.loadSpecies(this.speciesValue);
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
      this.cdr.detectChanges();
      return;
    }

    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      await firstValueFrom(this.petsApi.updateBasic(this.pet.id, payload));
      this.saved.emit();
    } catch (error: unknown) {
      this.submitError = this.resolveErrorMessage(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
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

  protected onSpeciesChanged(value: string): void {
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

      this.clearSpeciesSearchTimer();
      return;
    }

    this.breedId = null;
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
  }

  protected colorOptions(): ColorApiResponse[] {
    return this.colors;
  }

  protected onNameChanged(value: string): void {
    this.name = value;
    this.submitError = null;
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
    return this.showValidationErrors && this.name.trim().length === 0;
  }

  protected isNameTooLong(): boolean {
    return this.showValidationErrors && this.name.trim().length > PET_NAME_MAX_LENGTH;
  }

  protected isSpeciesInvalid(): boolean {
    return this.showValidationErrors && !this.resolveSpeciesByName(this.speciesValue);
  }

  protected isBreedInvalid(): boolean {
    return (
      this.showValidationErrors &&
      this.resolveSpeciesByName(this.speciesValue) !== null &&
      this.resolveBreedById(this.resolveSpeciesByName(this.speciesValue), this.breedId) === null
    );
  }

  protected isBirthDateInvalid(): boolean {
    return this.showValidationErrors && !isValidPetBirthDate(this.birthDate);
  }

  protected isWeightRequiredInvalid(): boolean {
    return this.showValidationErrors && this.normalizedWeightValue().length === 0;
  }

  protected isWeightInvalid(): boolean {
    const rawWeight = this.normalizedWeightValue();
    return (
      this.showValidationErrors &&
      rawWeight.length > 0 &&
      this.parseWeight() === null
    );
  }

  protected isColorInvalid(): boolean {
    return this.showValidationErrors && !this.selectedColor;
  }

  protected isGeneralAllergiesTooLong(): boolean {
    return this.showValidationErrors && this.generalAllergies.trim().length > PET_TEXTAREA_MAX_LENGTH;
  }

  protected isGeneralHistoryTooLong(): boolean {
    return this.showValidationErrors && this.generalHistory.trim().length > PET_TEXTAREA_MAX_LENGTH;
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
    } catch {
      if (requestToken !== this.speciesRequestVersion) {
        return;
      }

      this.species = [];
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
    const name = this.name.trim();
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);
    const selectedBreed = this.resolveBreedById(selectedSpecies, this.breedId);
    const currentWeight = this.parseWeight();
    const birthDate = this.birthDate.trim();
    const generalAllergies = this.generalAllergies.trim();
    const generalHistory = this.generalHistory.trim();

    if (
      !name ||
      name.length > PET_NAME_MAX_LENGTH ||
      !selectedSpecies ||
      !selectedBreed ||
      !this.selectedColor ||
      currentWeight === null ||
      !isValidPetBirthDate(birthDate) ||
      generalAllergies.length > PET_TEXTAREA_MAX_LENGTH ||
      generalHistory.length > PET_TEXTAREA_MAX_LENGTH
    ) {
      return null;
    }

    const payload: UpdatePetBasicRequest = {
      name,
      speciesId: selectedSpecies.id,
      breedId: selectedBreed.id,
      sex: this.editGender === 'Hembra' ? 'HEMBRA' : 'MACHO',
      currentWeight,
      colorId: this.selectedColor.id,
      sterilized: this.editSterilized === 'Si',
      generalAllergies,
      generalHistory,
    };

    if (birthDate) {
      payload.birthDate = birthDate;
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

  private resolveErrorMessage(error: unknown): string {
    return resolveApiErrorMessage(error, {
      defaultMessage: 'No se pudo actualizar la mascota.',
    });
  }
}
