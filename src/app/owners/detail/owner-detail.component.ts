import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { EditOwnerModalComponent } from '../edit/edit-owner-modal.component';
import { OwnersApiService } from '../api/owners-api.service';
import { ClientPetApiResponse } from '../models/client-pet.model';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import { UpdateClientRequest } from '../models/client-update.model';
import { buildClientFullName, buildClientInitials, mapClientGenderLabel } from '../models/client-summary.model';

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [EditOwnerModalComponent],
  templateUrl: './owner-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerDetailComponent {
  private readonly ownersApi = inject(OwnersApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private _ownerId = '';
  private requestVersion = 0;

  @Input({ required: true })
  set ownerId(value: string) {
    this._ownerId = value;
    if (!value) {
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

    void this.loadOwner(value, requestToken);
    void this.loadPets(Number(value), requestToken);
  }

  get ownerId(): string {
    return this._ownerId;
  }

  @Output() readonly back = new EventEmitter<void>();

  protected isEditOwnerModalOpen = false;
  protected isEditOwnerSaving = false;
  protected isLoading = false;
  protected isPetsLoading = true;
  protected editOwnerErrorMessage: string | null = null;
  protected loadError: string | null = null;
  protected loadPetError: string | null = null;
  protected owner: ClientResponseApiResponse | null = null;
  protected pets: ClientPetApiResponse[] = [];

  protected goBack(): void {
    this.back.emit();
  }

  protected openEditOwnerModal(): void {
    this.editOwnerErrorMessage = null;
    this.isEditOwnerModalOpen = true;
  }

  protected closeEditOwnerModal(): void {
    if (this.isEditOwnerSaving) {
      return;
    }

    this.isEditOwnerModalOpen = false;
    this.editOwnerErrorMessage = null;
  }

  protected async saveEditOwnerDraft(
    payload: UpdateClientRequest,
  ): Promise<void> {
    if (!this.owner || this.isEditOwnerSaving) {
      return;
    }

    this.editOwnerErrorMessage = null;
    this.isEditOwnerSaving = true;
    this.cdr.detectChanges();

    try {
      const updatedOwner = await firstValueFrom(
        this.ownersApi.updateClient(this.owner.id, payload),
      );

      this.owner = updatedOwner;
      this.isEditOwnerModalOpen = false;
    } catch (error: unknown) {
      this.editOwnerErrorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar el propietario.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
    } finally {
      this.isEditOwnerSaving = false;
      this.cdr.detectChanges();
    }
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
