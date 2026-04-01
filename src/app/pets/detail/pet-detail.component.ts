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
import { EditPetModalComponent } from '../edit/edit-pet-modal.component';
import {
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
} from '../models/pet-detail.model';
import { PetsApiService } from '../services/pets-api.service';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [EditPetModalComponent],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent {
  private readonly petsApi = inject(PetsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private _petId = '';
  private requestVersion = 0;

  @Input({ required: true })
  set petId(value: string) {
    this._petId = value;
    if (!value) {
      return;
    }

    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.pet = null;
    this.cdr.detectChanges();
    void this.loadPet(value, requestToken);
  }

  get petId(): string {
    return this._petId;
  }

  @Output() readonly back = new EventEmitter<void>();

  protected isLoading = false;
  protected loadError: string | null = null;
  protected pet: PetBasicDetailApiResponse | null = null;
  protected isEditPetModalOpen = false;

  protected goBack(): void {
    this.back.emit();
  }

  protected openEditPetModal(): void {
    this.isEditPetModalOpen = true;
  }

  protected closeEditPetModal(): void {
    this.isEditPetModalOpen = false;
  }

  protected saveEditPetDraft(): void {
    this.closeEditPetModal();
    if (!this.petId) {
      return;
    }

    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();
    void this.loadPet(this.petId, requestToken);
  }

  protected buildPetInitial(): string {
    return this.pet?.name.trim().charAt(0).toUpperCase() || 'P';
  }

  protected buildSpeciesLabel(): string {
    return this.pet?.species?.name?.trim() || 'Sin especie registrada';
  }

  protected buildBreedLabel(): string {
    return this.pet?.breed?.name?.trim() || 'Sin raza registrada';
  }

  protected buildSexLabel(): string {
    switch ((this.pet?.sex ?? '').trim().toUpperCase()) {
      case 'MACHO':
        return 'Macho';
      case 'HEMBRA':
        return 'Hembra';
      default:
        return 'No especificado';
    }
  }

  protected buildWeightLabel(): string {
    if (this.pet?.currentWeight === null || this.pet?.currentWeight === undefined) {
      return 'Peso no registrado';
    }

    return `${this.pet.currentWeight} kg`;
  }

  protected buildAgeLabel(): string {
    if (this.pet?.ageYears === null || this.pet?.ageYears === undefined) {
      return 'Edad no registrada';
    }

    return `${this.pet.ageYears} ${this.pet.ageYears === 1 ? 'ano' : 'anos'}`;
  }

  protected buildBirthDateLabel(): string {
    if (!this.pet?.birthDate) {
      return 'Fecha no registrada';
    }

    return this.pet.birthDate.slice(0, 10);
  }

  protected buildColorLabel(): string {
    return this.pet?.color?.name?.trim() || 'Sin color registrado';
  }

  protected buildSterilizedLabel(): string {
    if (this.pet?.sterilized === true) {
      return 'Si';
    }

    if (this.pet?.sterilized === false) {
      return 'No';
    }

    return 'No registrado';
  }

  protected clinicalObservations(): PetClinicalObservationApiResponse[] {
    return this.pet?.clinicalObservations ?? [];
  }

  protected generalAllergies(): string | null {
    const value = this.pet?.generalAllergies?.trim();
    return value ? value : null;
  }

  protected generalHistory(): string | null {
    const value = this.pet?.generalHistory?.trim();
    return value ? value : null;
  }

  protected hasGeneralClinicalSummary(): boolean {
    return this.generalAllergies() !== null || this.generalHistory() !== null;
  }

  protected hasClinicalContent(): boolean {
    return (
      this.clinicalObservations().length > 0 ||
      this.hasGeneralClinicalSummary()
    );
  }

  protected buildObservationMeta(
    observation: PetClinicalObservationApiResponse,
  ): string {
    const labels: string[] = [];

    if (observation.type?.trim()) {
      labels.push(observation.type.trim());
    }

    if (observation.active) {
      labels.push('Activa');
    }

    return labels.join(' - ');
  }

  private async loadPet(petId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.petsApi.getBasicById(petId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.pet = response;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el detalle de la mascota.';
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
