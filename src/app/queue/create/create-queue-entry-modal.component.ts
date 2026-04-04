import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, map, tap } from 'rxjs';
import { OwnersApiService } from '@app/owners/api/owners-api.service';
import { ClientPetApiResponse } from '@app/owners/models/client-pet.model';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { PetListItemApiResponse } from '@app/pets/models/pet-list.model';
import { QueueApiService } from '../api/queue-api.service';
import { QueueEntryCreateRequest, QueueEntryType } from '../models/queue.model';

interface QueueSelectedPet {
  id: number;
  name: string;
  species: string;
  breed: string;
  tutorName: string;
  tutorPhone: string;
}

interface QueueLookupResult {
  id: string;
  type: 'pet' | 'tutor';
  title: string;
  subtitle: string;
  detail: string;
  pet?: PetListItemApiResponse;
  tutor?: ClientTutorBasicApiResponse;
}

@Component({
  selector: 'app-queue-intake-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './create-queue-entry-modal.component.html',
  styleUrl: './create-queue-entry-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueIntakePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly queueApi = inject(QueueApiService);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lookupLimit = 6;
  private lookupRequestVersion = 0;
  private tutorPetsRequestVersion = 0;

  protected readonly lookupControl = new FormControl<string | QueueLookupResult>('', {
    nonNullable: true,
  });
  protected readonly tutorPetControl = new FormControl<string | ClientPetApiResponse>('', {
    nonNullable: true,
  });
  protected initialEntryType: QueueEntryType = 'SIN_CITA';
  protected readonly displayLookupValue = (
    value: string | QueueLookupResult | null,
  ): string => (typeof value === 'string' ? value : value?.title ?? '');
  protected readonly displayTutorPetValue = (
    value: string | ClientPetApiResponse | null,
  ): string => (typeof value === 'string' ? value : value?.name?.trim() ?? '');

  protected readonly form = this.fb.nonNullable.group({
    scheduledTime: [''],
    notes: ['', [Validators.maxLength(600)]],
    isEmergency: [false],
  });

  protected isSaving = false;
  protected isSearching = false;
  protected isLoadingTutorPets = false;
  protected lookupError: string | null = null;
  protected tutorPetsError: string | null = null;
  protected errorMessage: string | null = null;
  protected lookupResults: readonly QueueLookupResult[] = [];
  protected selectedTutor: ClientTutorBasicApiResponse | null = null;
  protected selectedTutorPets: readonly ClientPetApiResponse[] = [];
  protected selectedPet: QueueSelectedPet | null = null;

  ngOnInit(): void {
    const state = history.state as { initialEntryType?: QueueEntryType } | null;
    if (state?.initialEntryType === 'CON_CITA' || state?.initialEntryType === 'SIN_CITA') {
      this.initialEntryType = state.initialEntryType;
    }

    this.form.controls.scheduledTime.setValue(this.getCurrentTime(), { emitEvent: false });

    this.lookupControl.valueChanges
      .pipe(
        tap((value) => {
          if (typeof value === 'string') {
            this.handleLookupChange(value);
          }
        }),
        debounceTime(300),
        map((value) => (typeof value === 'string' ? value.trim() : '')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        void this.runLookup(term);
      });
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    void this.backToQueue();
  }

  protected get entryModeLabel(): string {
    return this.initialEntryType === 'CON_CITA' ? 'Con cita' : 'Sin cita';
  }

  protected hasLookupTerm(): boolean {
    return typeof this.lookupControl.value === 'string' && this.lookupControl.value.trim().length > 0;
  }

  protected hasTutorPetTerm(): boolean {
    return (
      typeof this.tutorPetControl.value === 'string' &&
      this.tutorPetControl.value.trim().length > 0
    );
  }

  protected get petLookupResults(): readonly QueueLookupResult[] {
    return this.lookupResults.filter((result) => result.type === 'pet');
  }

  protected get tutorLookupResults(): readonly QueueLookupResult[] {
    return this.lookupResults.filter((result) => result.type === 'tutor');
  }

  protected get hasLookupResults(): boolean {
    return this.lookupResults.length > 0;
  }

  protected clearSelection(): void {
    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.lookupControl.setValue('', { emitEvent: false });
    this.tutorPetControl.setValue('', { emitEvent: false });
    this.lookupResults = [];
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.selectedPet = null;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.isSearching = false;
    this.isLoadingTutorPets = false;
    this.cdr.markForCheck();
  }

  protected resetTutorSelection(): void {
    this.tutorPetsRequestVersion++;
    this.lookupControl.setValue('', { emitEvent: false });
    this.tutorPetControl.setValue('', { emitEvent: false });
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.tutorPetsError = null;
    this.isLoadingTutorPets = false;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  protected buildTutorLabel(option: ClientTutorBasicApiResponse): string {
    return `${option.firstName} ${option.lastName}`.trim();
  }

  protected buildTutorPhone(option: ClientTutorBasicApiResponse): string {
    return option.phone?.trim() || 'Sin telefono registrado';
  }

  protected buildPetSubtitle(
    pet:
      | Pick<PetListItemApiResponse, 'species' | 'breed'>
      | Pick<ClientPetApiResponse, 'species' | 'breed'>,
  ): string {
    const species = pet.species?.name?.trim() || 'Sin especie registrada';
    const breed = pet.breed?.name?.trim() || 'Sin raza registrada';
    return `${species} | ${breed}`;
  }

  protected buildPetTutorMeta(pet: PetListItemApiResponse): string {
    const tutorName = pet.tutorName?.trim() || 'Sin tutor registrado';
    const tutorPhone = pet.tutorContact?.trim() || 'Sin telefono registrado';
    return `${tutorName} | ${tutorPhone}`;
  }

  protected getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const firstInitial = parts[0]?.charAt(0) ?? '';
    const secondInitial = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${firstInitial}${secondInitial}`.trim().toUpperCase() || 'Q';
  }

  protected onLookupOptionSelection(isUserInput: boolean, result: QueueLookupResult): void {
    if (!isUserInput) {
      return;
    }

    this.onLookupResultSelect(result);
  }

  protected onLookupResultSelect(result: QueueLookupResult): void {
    if (result.type === 'pet' && result.pet) {
      this.selectGlobalPet(result.pet);
      return;
    }

    if (result.type === 'tutor' && result.tutor) {
      this.selectTutor(result.tutor);
    }
  }

  protected onTutorPetOptionSelection(isUserInput: boolean, pet: ClientPetApiResponse): void {
    if (!isUserInput) {
      return;
    }

    this.selectTutorPet(pet);
  }

  protected selectTutorPet(pet: ClientPetApiResponse): void {
    if (!this.selectedTutor) {
      return;
    }

    this.applySelection(this.buildTutorPetSelection(pet, this.selectedTutor));
  }

  protected retrySelectedTutorPets(): void {
    if (!this.selectedTutor || this.isLoadingTutorPets) {
      return;
    }

    void this.loadTutorPets(this.selectedTutor);
  }

  protected filteredTutorPets(): readonly ClientPetApiResponse[] {
    const value = this.tutorPetControl.value;
    const search = typeof value === 'string' ? value.trim().toLowerCase() : '';

    if (!search) {
      return this.selectedTutorPets;
    }

    return this.selectedTutorPets.filter((pet) => {
      const name = pet.name?.trim().toLowerCase() ?? '';
      const species = pet.species?.name?.trim().toLowerCase() ?? '';
      const breed = pet.breed?.name?.trim().toLowerCase() ?? '';
      return name.includes(search) || species.includes(search) || breed.includes(search);
    });
  }

  protected openOwnersModule(): void {
    void this.router.navigate(['/owners'], {
      state: {
        openCreateModal: true,
        returnTo: '/queue/new',
      },
    });
  }

  protected openPetsModule(): void {
    const state: Record<string, unknown> = {
      openCreateModal: true,
      returnTo: '/queue/new',
    };

    if (this.selectedTutor) {
      state['initialTutor'] = { ...this.selectedTutor };
    }

    void this.router.navigate(['/pets'], { state });
  }

  protected openPetsModuleForTutor(tutor: ClientTutorBasicApiResponse): void {
    void this.router.navigate(['/pets'], {
      state: {
        openCreateModal: true,
        initialTutor: { ...tutor },
        returnTo: '/queue/new',
      },
    });
  }

  protected async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (!this.selectedPet) {
      this.errorMessage = 'Selecciona un paciente antes de registrar el ingreso.';
      this.cdr.markForCheck();
      return;
    }

    if (this.form.invalid) {
      this.errorMessage = null;
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const value = this.form.getRawValue();
      const payload: QueueEntryCreateRequest = {
        patientId: this.selectedPet.id,
        entryType: value.isEmergency ? 'EMERGENCIA' : this.initialEntryType,
        scheduledTime: value.scheduledTime.trim() || null,
        notes: value.notes.trim() || null,
      };

      const createdEntry = await firstValueFrom(this.queueApi.createEntry(payload));
      await this.router.navigate(['/queue'], { state: { entryId: createdEntry.id } });
    } catch {
      this.errorMessage = 'No se pudo registrar el paciente en la cola. Intenta nuevamente.';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async runLookup(rawValue: string): Promise<void> {
    const term = rawValue.trim();
    const requestToken = ++this.lookupRequestVersion;

    this.lookupError = null;

    if (!term) {
      this.lookupResults = [];
      this.isSearching = false;
      this.cdr.markForCheck();
      return;
    }

    this.isSearching = true;
    this.cdr.markForCheck();

    try {
      const [tutorsResponse, petsResponse] = await Promise.all([
        firstValueFrom(
          this.ownersApi.listBasicTutors({
            page: 1,
            limit: this.lookupLimit,
            search: term,
          }),
        ),
        firstValueFrom(
          this.petsApi.list({
            page: 1,
            limit: this.lookupLimit,
            search: term,
          }),
        ),
      ]);

      if (requestToken !== this.lookupRequestVersion) {
        return;
      }

      this.lookupResults = this.buildLookupResults(petsResponse.data, tutorsResponse);
    } catch {
      if (requestToken !== this.lookupRequestVersion) {
        return;
      }

      this.lookupResults = [];
      this.lookupError = 'No se pudo buscar en el sistema.';
    } finally {
      if (requestToken !== this.lookupRequestVersion) {
        return;
      }

      this.isSearching = false;
      this.cdr.markForCheck();
    }
  }

  private handleLookupChange(rawValue: string): void {
    const term = rawValue.trim();

    this.lookupRequestVersion++;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;

    if (this.selectedTutor) {
      this.tutorPetsRequestVersion++;
      this.selectedTutor = null;
      this.selectedTutorPets = [];
      this.isLoadingTutorPets = false;
    }

    if (!term) {
      this.lookupResults = [];
      this.isSearching = false;
      this.cdr.markForCheck();
      return;
    }

    this.isSearching = true;
    this.cdr.markForCheck();
  }

  private selectTutor(tutor: ClientTutorBasicApiResponse): void {
    this.tutorPetsRequestVersion++;
    this.lookupControl.setValue('', { emitEvent: false });
    this.tutorPetControl.setValue('', { emitEvent: false });
    this.lookupResults = [];
    this.selectedTutor = tutor;
    this.selectedTutorPets = [];
    this.tutorPetsError = null;
    this.errorMessage = null;
    void this.loadTutorPets(tutor);
    this.cdr.markForCheck();
  }

  private selectGlobalPet(pet: PetListItemApiResponse): void {
    this.applySelection(this.buildGlobalPetSelection(pet));
  }

  private async loadTutorPets(tutor: ClientTutorBasicApiResponse): Promise<void> {
    const requestToken = ++this.tutorPetsRequestVersion;

    this.isLoadingTutorPets = true;
    this.tutorPetsError = null;
    this.selectedTutorPets = [];
    this.cdr.markForCheck();

    try {
      const pets = await firstValueFrom(this.ownersApi.getClientPets(tutor.id));

      if (requestToken !== this.tutorPetsRequestVersion) {
        return;
      }

      this.selectedTutorPets = pets;
    } catch {
      if (requestToken !== this.tutorPetsRequestVersion) {
        return;
      }

      this.tutorPetsError = 'No se pudieron cargar las mascotas del tutor.';
    } finally {
      if (requestToken !== this.tutorPetsRequestVersion) {
        return;
      }

      this.isLoadingTutorPets = false;
      this.cdr.markForCheck();
    }
  }

  private buildLookupResults(
    pets: readonly PetListItemApiResponse[],
    tutors: readonly ClientTutorBasicApiResponse[],
  ): QueueLookupResult[] {
    const petResults = pets.map((pet) => ({
      id: `pet-${pet.id}`,
      type: 'pet' as const,
      title: pet.name.trim(),
      subtitle: this.buildPetSubtitle(pet),
      detail: this.buildPetTutorMeta(pet),
      pet,
    }));

    const tutorResults = tutors.map((tutor) => ({
      id: `tutor-${tutor.id}`,
      type: 'tutor' as const,
      title: this.buildTutorLabel(tutor),
      subtitle: this.buildTutorPhone(tutor),
      detail: 'Selecciona el tutor para ver y elegir su mascota.',
      tutor,
    }));

    return [...petResults, ...tutorResults];
  }

  private applySelection(selection: QueueSelectedPet): void {
    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.lookupControl.setValue('', { emitEvent: false });
    this.tutorPetControl.setValue('', { emitEvent: false });
    this.lookupResults = [];
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.selectedPet = selection;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.isSearching = false;
    this.isLoadingTutorPets = false;
    this.cdr.markForCheck();
  }

  private buildGlobalPetSelection(pet: PetListItemApiResponse): QueueSelectedPet {
    return {
      id: pet.id,
      name: pet.name.trim(),
      species: pet.species?.name?.trim() || 'Sin especie registrada',
      breed: pet.breed?.name?.trim() || 'Sin raza registrada',
      tutorName: pet.tutorName?.trim() || 'Sin tutor registrado',
      tutorPhone: pet.tutorContact?.trim() || 'Sin telefono registrado',
    };
  }

  private buildTutorPetSelection(
    pet: ClientPetApiResponse,
    tutor: ClientTutorBasicApiResponse,
  ): QueueSelectedPet {
    return {
      id: pet.id,
      name: pet.name.trim(),
      species: pet.species?.name?.trim() || 'Sin especie registrada',
      breed: pet.breed?.name?.trim() || 'Sin raza registrada',
      tutorName: this.buildTutorLabel(tutor),
      tutorPhone: this.buildTutorPhone(tutor),
    };
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = `${now.getHours()}`.padStart(2, '0');
    const minutes = `${now.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private async backToQueue(): Promise<void> {
    await this.router.navigate([this.getReturnPath()]);
  }

  private getReturnPath(): string {
    const state = history.state as { returnTo?: string } | null;
    return state?.returnTo?.trim() || '/queue';
  }
}
