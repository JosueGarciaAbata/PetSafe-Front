import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EditPetModalComponent } from '../edit/edit-pet-modal.component';
import { PetApiResponse } from '../models/pet.model';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [EditPetModalComponent],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent {
  private readonly router = inject(Router);
  private _pet!: PetApiResponse;

  protected isEditPetModalOpen = false;
  protected showImage = true;

  @Input({ required: true })
  set pet(value: PetApiResponse) {
    this._pet = value;
    this.showImage = true;
  }

  get pet(): PetApiResponse {
    return this._pet;
  }

  @Output() readonly back = new EventEmitter<void>();

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
  }

  protected goToOwnerDetail(): void {
    void this.router.navigate(['/owners'], {
      state: { ownerId: this.pet.tutor.id },
    });
  }

  protected handleImageError(): void {
    this.showImage = false;
  }

  protected getPetInitials(): string {
    return this.pet.nombre.charAt(0).toUpperCase();
  }

  protected buildPetSubtitle(): string {
    const species = this.pet.especie?.trim() || 'Sin especie registrada';
    const breed = this.pet.raza?.trim() || 'Sin raza registrada';

    return `${species} · ${breed}`;
  }

  protected buildTutorName(): string {
    return `${this.pet.tutor.nombre} ${this.pet.tutor.apellido}`.trim();
  }
}
