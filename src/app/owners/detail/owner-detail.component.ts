import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { CreateOwnerAccessModalComponent } from '../create/create-owner-access-modal.component';
import { OwnersApiService } from '../api/owners-api.service';
import { ClientPetApiResponse } from '../models/client-pet.model';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import { UpdateClientRequest } from '../models/client-update.model';
import { buildClientFullName, buildClientInitials, mapClientGenderLabel } from '../models/client-summary.model';

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [CreateOwnerAccessModalComponent],
  templateUrl: './owner-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerDetailComponent implements OnInit {
  private readonly ownersApi = inject(OwnersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/owners'];
  protected backLabel = 'Volver a propietarios';

  ngOnInit(): void {
    const navigationState = history.state as {
      backTarget?: readonly (string | number)[] | null;
      backLabel?: string | null;
    } | null;
    this.backTarget = navigationState?.backTarget ?? ['/owners'];
    this.backLabel = navigationState?.backLabel?.trim() || 'Volver a propietarios';

    this.route.paramMap.subscribe((params) => {
      const ownerId = params.get('id');
      if (!ownerId) {
        void this.router.navigate(['/owners']);
        return;
      }

      const requestToken = ++this.requestVersion;
      this.isLoading = true;
      this.isPetsLoading = true;
      this.loadError = null;
      this.loadPetError = null;
      this.owner = null;
      this.pets = [];
      this.cdr.detectChanges();

      void this.loadOwner(ownerId, requestToken);
      void this.loadPets(Number(ownerId), requestToken);
    });
  }
  protected isLoading = false;
  protected isPetsLoading = true;
  protected loadError: string | null = null;
  protected loadPetError: string | null = null;
  protected owner: ClientResponseApiResponse | null = null;
  protected pets: ClientPetApiResponse[] = [];
  protected isCreateAccessModalOpen = false;

  protected goBack(): void {
    void this.router.navigate(this.backTarget, { replaceUrl: true });
  }

  protected openEditOwnerPage(): void {
    if (!this.owner) {
      return;
    }

    void this.router.navigate(['/owners', this.owner.id, 'edit'], {
      state: {
        detailBackTarget: this.backTarget,
        detailBackLabel: this.backLabel,
      },
    });
  }

  protected openCreatePetPage(): void {
    if (!this.owner) {
      return;
    }

    void this.router.navigate(['/pets/new'], {
      state: {
        initialTutor: {
          id: this.owner.id,
          firstName: this.owner.person.firstName,
          lastName: this.owner.person.lastName,
          phone: this.owner.person.phone ?? null,
        },
        quickCreateForTutor: true,
        ownerBackTarget: ['/owners', this.owner.id],
        ownerBackLabel: 'Volver al tutor',
      },
    });
  }

  protected buildFullName(): string {
    return buildClientFullName(this.owner as ClientResponseApiResponse);
  }

  protected buildInitials(): string {
    return buildClientInitials(this.owner as ClientResponseApiResponse);
  }

  protected buildGenderLabel(): string {
    return mapClientGenderLabel(this.owner?.person.gender);
  }

  protected buildPhoneLabel(): string {
    return this.owner?.person.phone?.trim() || 'Sin telefono asignado';
  }

  protected shouldShowCreateAccessButton(): boolean {
    return !this.owner?.email?.trim();
  }

  protected openCreateAccessModal(): void {
    if (!this.owner || !this.shouldShowCreateAccessButton()) {
      return;
    }

    this.isCreateAccessModalOpen = true;
  }

  protected closeCreateAccessModal(): void {
    this.isCreateAccessModalOpen = false;
  }

  protected onOwnerAccessCreated(owner: ClientResponseApiResponse): void {
    this.owner = owner;
    this.isCreateAccessModalOpen = false;
    this.cdr.detectChanges();
  }

  protected buildIdentificationLabel(): string {
    return (
      this.owner?.person.identification?.trim()
      || this.owner?.person.documentId?.trim()
      || 'No registrada'
    );
  }

  protected buildAddressLabel(): string {
    return this.owner?.person.address?.trim() || 'Sin direccion asignada';
  }

  protected buildNotesLabel(): string {
    return this.owner?.notes?.trim() || 'Sin observaciones registradas para este cliente.';
  }

  protected buildPetSpeciesBreedLabel(pet: ClientPetApiResponse): string {
    const species = pet.species?.name?.trim() || 'Sin especie registrada';
    const breed = pet.breed?.name?.trim() || 'Sin raza registrada';
    return `${species} - ${breed}`;
  }

  protected buildPetColorLabel(pet: ClientPetApiResponse): string {
    return pet.color?.name?.trim() || 'Sin color registrado';
  }

  protected openPetDetail(pet: ClientPetApiResponse): void {
    void this.router.navigate(['/pets', pet.id], {
      state: {
        backTarget: ['/owners', this.owner?.id ?? 0],
        backLabel: 'Volver al propietario',
      },
    });
  }

  protected petImageUrl(
    pet: ClientPetApiResponse | { image?: { url?: string | null } | null },
  ): string | null {
    return pet.image?.url?.trim() || null;
  }

  protected petImageAlt(pet: { name: string }): string {
    return `Foto de ${pet.name}`;
  }

  private async loadOwner(
    ownerId: string,
    requestToken: number,
  ): Promise<void> {
    if (!ownerId) {
      return;
    }

    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.ownersApi.getClientById(ownerId),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.owner = response;
      this.cdr.detectChanges();
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el detalle del cliente.';
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadPets(clientId: number, requestToken: number): Promise<void> {
    this.isPetsLoading = true;
    this.pets = [];
    this.loadPetError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.ownersApi.getClientPets(clientId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.pets = response;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadPetError = 'No se pudo cargar las mascotas del cliente.';
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isPetsLoading = false;
      this.cdr.detectChanges();
    }
  }
}
