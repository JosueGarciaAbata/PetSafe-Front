import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import { CreatePetModalComponent } from '../create/create-pet-modal.component';
import { PetDetailComponent } from '../detail/pet-detail.component';
import { PetListItemApiResponse } from '../models/pet-list.model';
import { PetsApiService } from '../services/pets-api.service';

@Component({
  selector: 'app-pets-page',
  standalone: true,
  imports: [PaginationComponent, CreatePetModalComponent, PetDetailComponent],
  templateUrl: './pets-page.component.html',
  styleUrl: './pets-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetsPageComponent implements OnInit {
  private readonly petsApi = inject(PetsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;
  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected pets: PetListItemApiResponse[] = [];
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected searchValue = '';
  protected isLoading = false;
  protected loadError: string | null = null;
  protected isCreateModalOpen = false;
  protected selectedPetId: string | null = null;
  protected pendingTutor: ClientTutorBasicApiResponse | null = null;

  ngOnInit(): void {
    const state = history.state as
      | {
          petId?: string | number;
          openCreateModal?: boolean;
          initialTutor?: ClientTutorBasicApiResponse | null;
        }
      | null;
    this.selectedPetId = state?.petId != null ? String(state.petId) : null;
    this.pendingTutor = state?.initialTutor ?? null;
    this.isCreateModalOpen = Boolean(state?.openCreateModal);
    void this.loadPets(1);
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadPets(page);
  }

  protected openCreateModal(): void {
    this.pendingTutor = null;
    this.isCreateModalOpen = true;
  }

  protected closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.pendingTutor = null;
  }

  protected openPetDetail(pet: PetListItemApiResponse): void {
    this.selectedPetId = String(pet.id);
  }

  protected closePetDetail(): void {
    this.selectedPetId = null;
  }

  protected onCreateSaved(): void {
    this.closeCreateModal();
    this.clearSearchTimer();
    void this.loadPets(1);
  }

  protected getInitials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || 'P';
  }

  protected buildPetSubtitle(pet: PetListItemApiResponse): string {
    const species = pet.species?.name?.trim() || 'Sin especie registrada';
    const breed = pet.breed?.name?.trim() || 'Sin raza registrada';
    return `${species} - ${breed}`;
  }

  protected buildTutorName(pet: PetListItemApiResponse): string {
    return pet.tutorName?.trim() || 'Sin tutor registrado';
  }

  protected buildTutorContact(pet: PetListItemApiResponse): string {
    return pet.tutorContact?.trim() || 'Sin contacto registrado';
  }

  protected buildAgeLabel(pet: PetListItemApiResponse): string {
    if (pet.ageYears === null || pet.ageYears === undefined) {
      return 'Edad no registrada';
    }

    return `${pet.ageYears} ${pet.ageYears === 1 ? 'ano' : 'anos'}`;
  }

  protected buildSexLabel(pet: PetListItemApiResponse): string {
    switch ((pet.sex ?? '').trim().toUpperCase()) {
      case 'MACHO':
        return 'Macho';
      case 'HEMBRA':
        return 'Hembra';
      default:
        return 'No especificado';
    }
  }

  protected buildWeightLabel(pet: PetListItemApiResponse): string {
    if (pet.currentWeight === null || pet.currentWeight === undefined) {
      return 'Peso no registrado';
    }

    return `${pet.currentWeight} kg`;
  }

  protected buildBasicInfo(pet: PetListItemApiResponse): string {
    return `${this.buildAgeLabel(pet)} - ${this.buildSexLabel(pet)} - ${this.buildWeightLabel(pet)}`;
  }

  protected buildBirthDateLabel(pet: PetListItemApiResponse): string {
    if (!pet.birthDate) {
      return 'Nacimiento no registrado';
    }

    return `Nacimiento: ${pet.birthDate.slice(0, 10)}`;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadPets(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadPets(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.pets = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.petsApi.list({
          page,
          limit: this.pageSize,
          search: this.searchValue.trim() || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.pets = response.data;
      this.meta = response.meta;
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

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
