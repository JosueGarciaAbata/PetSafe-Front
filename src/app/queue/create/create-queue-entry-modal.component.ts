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
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, map, tap } from 'rxjs';
import { OwnersApiService } from '@app/owners/api/owners-api.service';
import { ClientPetApiResponse } from '@app/owners/models/client-pet.model';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { PetListItemApiResponse } from '@app/pets/models/pet-list.model';
import { QueueApiService } from '../api/queue-api.service';
import {
  QUEUE_VETERINARIANS,
  QueueEntryCreateRequest,
  QueueEntryType,
} from '../models/queue.model';

interface QueueSelectedPet {
  id: number;
  name: string;
  species: string;
  breed: string;
  tutorName: string;
  tutorPhone: string;
}

@Component({
  selector: 'app-queue-intake-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  private readonly defaultVeterinarianId = QUEUE_VETERINARIANS[0].id;
  private readonly lookupLimit = 5;
  private lookupRequestVersion = 0;
  private tutorPetsRequestVersion = 0;

  protected readonly lookupControl = new FormControl('', { nonNullable: true });
  protected initialEntryType: QueueEntryType = 'SIN_CITA';

  protected readonly form = this.fb.nonNullable.group({
    patientName: ['', [Validators.required, Validators.maxLength(120)]],
    patientSpecies: ['', [Validators.required, Validators.maxLength(80)]],
    patientBreed: ['', [Validators.required, Validators.maxLength(80)]],
    tutorName: ['', [Validators.required, Validators.maxLength(120)]],
    tutorPhone: ['', [Validators.required, Validators.maxLength(25)]],
    scheduledTime: [''],
    notes: [''],
    isEmergency: [false],
  });

  protected isSaving = false;
  protected isSearching = false;
  protected isLoadingTutorPets = false;
  protected lookupError: string | null = null;
  protected tutorPetsError: string | null = null;
  protected errorMessage: string | null = null;
  protected tutorMatches: readonly ClientTutorBasicApiResponse[] = [];
  protected petMatches: readonly PetListItemApiResponse[] = [];
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
        tap((value) => this.handleLookupChange(value)),
        debounceTime(300),
        map((value) => value.trim()),
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

  protected hasLookupTerm(): boolean {
    return this.lookupControl.value.trim().length > 0;
  }

  protected clearSelection(): void {
    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.selectedPet = null;
    this.lookupControl.setValue('', { emitEvent: false });
    this.tutorMatches = [];
    this.petMatches = [];
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.isSearching = false;
    this.patchSelectionIntoForm(null);
    this.cdr.markForCheck();
  }

  protected buildTutorLabel(option: ClientTutorBasicApiResponse): string {
    return `${option.firstName} ${option.lastName}`.trim();
  }

  protected buildTutorPhone(option: ClientTutorBasicApiResponse): string {
    return option.phone?.trim() || 'Sin telefono registrado';
  }

  protected buildPetSubtitle(
    pet: Pick<PetListItemApiResponse, 'species' | 'breed'> | Pick<ClientPetApiResponse, 'species' | 'breed'>,
  ): string {
    const species = pet.species?.name?.trim() || 'Sin especie registrada';
    const breed = pet.breed?.name?.trim() || 'Sin raza registrada';
    return `${species} · ${breed}`;
  }

  protected selectTutor(tutor: ClientTutorBasicApiResponse): void {
    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.selectedTutor = tutor;
    this.selectedTutorPets = [];
    this.selectedPet = null;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.tutorMatches = [];
    this.petMatches = [];
    this.lookupControl.setValue('', { emitEvent: false });
    this.patchSelectionIntoForm(null);
    void this.loadTutorPets(tutor);
    this.cdr.markForCheck();
  }

  protected selectGlobalPet(pet: PetListItemApiResponse): void {
    const selection = this.buildGlobalPetSelection(pet);

    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.selectedPet = selection;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.tutorMatches = [];
    this.petMatches = [];
    this.lookupControl.setValue('', { emitEvent: false });
    this.patchSelectionIntoForm(selection);
    this.cdr.markForCheck();
  }

  protected selectTutorPet(pet: ClientPetApiResponse): void {
    if (!this.selectedTutor) {
      return;
    }

    const selection = this.buildTutorPetSelection(pet, this.selectedTutor);
    this.lookupRequestVersion++;
    this.tutorPetsRequestVersion++;
    this.selectedTutor = null;
    this.selectedTutorPets = [];
    this.selectedPet = selection;
    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;
    this.tutorMatches = [];
    this.petMatches = [];
    this.lookupControl.setValue('', { emitEvent: false });
    this.patchSelectionIntoForm(selection);
    this.cdr.markForCheck();
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
      this.errorMessage = 'Selecciona un paciente existente para continuar.';
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
        patientName: value.patientName.trim(),
        patientSpecies: value.patientSpecies.trim(),
        patientBreed: value.patientBreed.trim(),
        tutorName: value.tutorName.trim(),
        tutorPhone: value.tutorPhone.trim(),
        veterinarianId: this.defaultVeterinarianId,
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
      this.tutorMatches = [];
      this.petMatches = [];
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

      this.tutorMatches = tutorsResponse.data;
      this.petMatches = petsResponse.data;
    } catch {
      if (requestToken !== this.lookupRequestVersion) {
        return;
      }

      this.tutorMatches = [];
      this.petMatches = [];
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

    this.lookupError = null;
    this.tutorPetsError = null;
    this.errorMessage = null;

    if (!term) {
      this.tutorMatches = [];
      this.petMatches = [];
      this.isSearching = false;
      this.cdr.markForCheck();
      return;
    }

    this.isSearching = true;
    this.cdr.markForCheck();
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

  private patchSelectionIntoForm(selection: QueueSelectedPet | null): void {
    this.form.patchValue(
      {
        patientName: selection?.name ?? '',
        patientSpecies: selection?.species ?? '',
        patientBreed: selection?.breed ?? '',
        tutorName: selection?.tutorName ?? '',
        tutorPhone: selection?.tutorPhone ?? '',
      },
      { emitEvent: false },
    );
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
