import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { OwnersApiService } from '../../owners/api/owners-api.service';
import { ClientTutorBasicApiResponse } from '../../owners/models/client-tutor-basic.model';
import { ColorApiResponse } from '../models/color.model';
import { CreatePetRequest } from '../models/create-pet.model';
import {
  SpeciesApiResponse,
  SpeciesBreedApiResponse,
} from '../models/species.model';
import { ColorsApiService } from '../services/colors-api.service';
import { PetsApiService } from '../services/pets-api.service';
import { SpeciesApiService } from '../services/species-api.service';

type CreatePetGender = 'Macho' | 'Hembra';
type CreatePetSterilized = 'Si' | 'No';

@Component({
  selector: 'app-create-pet-modal',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './create-pet-modal.component.html',
  styleUrl: './create-pet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePetModalComponent implements OnInit, OnDestroy {
  private readonly colorsApi = inject(ColorsApiService);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly tutorsPageSize = 10;
  private readonly speciesPageSize = 20;
  private readonly colorsPageSize = 20;
  private tutorRequestVersion = 0;
  private speciesRequestVersion = 0;
  private colorRequestVersion = 0;
  private colorCreateVersion = 0;
  private tutorSearchTimer?: ReturnType<typeof setTimeout>;
  private speciesSearchTimer?: ReturnType<typeof setTimeout>;
  private colorSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingTutor = false;
  private isSelectingColor = false;

  protected tutorValue = '';
  protected petName = '';
  protected speciesValue = '';
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
  protected species: SpeciesApiResponse[] = [];
  protected isSpeciesLoading = false;
  protected selectedColor: ColorApiResponse | null = null;
  protected colors: ColorApiResponse[] = [];
  protected isColorsLoading = false;
  protected isCreatingColor = false;
  protected isSaving = false;
  protected showValidationErrors = false;
  protected submitError: string | null = null;
  protected colorCreateError: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  ngOnInit(): void {
    void this.loadTutors('');
    void this.loadSpecies('');
    void this.loadColors('');
  }

  ngOnDestroy(): void {
    this.clearTutorSearchTimer();
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
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
      this.cdr.detectChanges();
      return;
    }

    this.clearTutorSearchTimer();
    this.clearSpeciesSearchTimer();
    this.clearColorSearchTimer();
    void this.submitCreate(payload);
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

  protected colorOptions(): ColorApiResponse[] {
    return this.colors;
  }

  protected onSpeciesChanged(value: string): void {
    this.speciesValue = value;
    this.submitError = null;
    const matchedSpecies =
      this.species.find((item) => item.name === value.trim()) ?? null;
    if (matchedSpecies) {
      if (
        this.breedValue &&
        !matchedSpecies.breeds.some((breed) => breed.name === this.breedValue)
      ) {
        this.breedValue = '';
      }

      this.clearSpeciesSearchTimer();
      return;
    }

    this.breedValue = '';
    this.scheduleSpeciesSearch();
  }

  protected selectSpecies(value: string): void {
    const selected = this.species.find((item) => item.name === value) ?? null;
    this.speciesValue = selected?.name ?? value;
    this.breedValue = '';
  }

  protected onBreedChanged(value: string): void {
    this.breedValue = value;
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
    return this.showValidationErrors && !this.selectedTutor;
  }

  protected isPetNameInvalid(): boolean {
    return this.showValidationErrors && this.petName.trim().length === 0;
  }

  protected isSpeciesInvalid(): boolean {
    return this.showValidationErrors && !this.resolveSpeciesByName(this.speciesValue);
  }

  protected isColorInvalid(): boolean {
    return this.showValidationErrors && !this.selectedColor;
  }

  protected isWeightInvalid(): boolean {
    return this.showValidationErrors && this.parseWeight() === null;
  }

  protected isMicrochipInvalid(): boolean {
    return this.showValidationErrors && this.microchipCode.trim().length === 0;
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

      this.tutors = response.data;
      if (this.selectedTutor) {
        this.selectedTutor =
          response.data.find((item) => item.id === this.selectedTutor?.id) ?? this.selectedTutor;
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
        this.breedValue &&
        matchedSpecies &&
        !matchedSpecies.breeds.some((breed) => breed.name === this.breedValue)
      ) {
        this.breedValue = '';
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
    const name = this.petName.trim();
    const microchipCode = this.microchipCode.trim();
    const currentWeight = this.parseWeight();
    const selectedSpecies = this.resolveSpeciesByName(this.speciesValue);

    if (
      !this.selectedTutor ||
      !name ||
      !microchipCode ||
      !selectedSpecies ||
      !this.selectedColor ||
      currentWeight === null
    ) {
      return null;
    }

    const payload: CreatePetRequest = {
      clientId: this.selectedTutor.id,
      name,
      speciesId: selectedSpecies.id,
      colorId: this.selectedColor.id,
      microchipCode,
      sex: this.sex === 'Hembra' ? 'HEMBRA' : 'MACHO',
      currentWeight,
    };

    const birthDate = this.birthDate.trim();
    if (birthDate) {
      payload.birthDate = birthDate;
    }

    const generalAllergies = this.generalAllergies.trim();
    if (generalAllergies) {
      payload.generalAllergies = generalAllergies;
    }

    const generalHistory = this.generalHistory.trim();
    if (generalHistory) {
      payload.generalHistory = generalHistory;
    }

    return payload;
  }

  private parseWeight(): number | null {
    const rawValue = this.weightKg.toString().trim();
    if (!rawValue) {
      return null;
    }

    const parsedWeight = Number(rawValue);
    return Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : null;
  }

  private async submitCreate(payload: CreatePetRequest): Promise<void> {
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      await firstValueFrom(this.petsApi.create(payload));
      this.saved.emit();
    } catch (error: unknown) {
      this.submitError = this.resolveCreateErrorMessage(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private resolveCreateErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.extractBackendErrorMessage(error.error);
      if (backendMessage) {
        return backendMessage;
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servidor. Intenta nuevamente.';
      }

      if (error.status >= 400 && error.status < 500) {
        return 'Revisa los datos ingresados.';
      }
    }

    return 'No se pudo guardar la mascota.';
  }

  private extractBackendErrorMessage(body: unknown): string | null {
    if (!body) {
      return null;
    }

    if (typeof body === 'string') {
      const normalized = body.trim();
      return normalized.length > 0 ? normalized : null;
    }

    if (typeof body !== 'object') {
      return null;
    }

    const candidate = body as { message?: unknown };
    const message = candidate.message;

    if (Array.isArray(message)) {
      const normalizedMessages = message
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      return normalizedMessages.length > 0 ? normalizedMessages.join('\n') : null;
    }

    if (typeof message === 'string') {
      const normalized = message.trim();
      return normalized.length > 0 ? normalized : null;
    }

    return null;
  }
}
