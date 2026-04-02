import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import { PetCreateResponseApiResponse } from '../models/pet-create-response.model';
import { CreatePetModalComponent } from './create-pet-modal.component';

@Component({
  selector: 'app-pet-create-page',
  standalone: true,
  imports: [CreatePetModalComponent],
  templateUrl: './pet-create-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetCreatePageComponent {
  private readonly router = inject(Router);
  private readonly navigationState = history.state as {
    initialTutor?: ClientTutorBasicApiResponse | null;
    quickCreateForTutor?: boolean;
    ownerBackTarget?: readonly (string | number)[] | null;
    ownerBackLabel?: string | null;
  } | null;

  protected readonly initialTutor = this.navigationState?.initialTutor ?? null;
  protected readonly quickCreateForTutor = this.navigationState?.quickCreateForTutor === true;
  protected readonly ownerBackTarget = this.navigationState?.ownerBackTarget ?? null;
  protected readonly ownerBackLabel = this.navigationState?.ownerBackLabel?.trim() || 'Volver al tutor';
  protected createdPet: PetCreateResponseApiResponse | null = null;

  protected close(): void {
    if (this.ownerBackTarget) {
      void this.router.navigate(this.ownerBackTarget);
      return;
    }

    void this.router.navigate(['/pets']);
  }

  protected save(createdPet: PetCreateResponseApiResponse): void {
    if (this.quickCreateForTutor && this.initialTutor) {
      this.createdPet = createdPet;
      return;
    }

    void this.router.navigate(['/pets']);
  }

  protected buildBackLabel(): string {
    if (this.ownerBackTarget) {
      return this.ownerBackLabel;
    }

    return 'Volver a mascotas';
  }

  protected buildTutorName(): string {
    return this.initialTutor
      ? `${this.initialTutor.firstName} ${this.initialTutor.lastName}`.trim()
      : 'Tutor preseleccionado';
  }

  protected buildTutorPhone(): string {
    return this.initialTutor?.phone?.trim() || 'Sin teléfono registrado';
  }

  protected registerAnotherPet(): void {
    this.createdPet = null;
  }

  protected openCreatedPet(): void {
    if (!this.createdPet) {
      return;
    }

    void this.router.navigate(['/pets', this.createdPet.id], {
      state: {
        backTarget: this.ownerBackTarget ?? ['/pets'],
        backLabel: this.ownerBackTarget ? this.ownerBackLabel : 'Volver a mascotas',
      },
    });
  }

  protected openOwnerProfile(): void {
    if (!this.initialTutor) {
      return;
    }

    void this.router.navigate(['/owners', this.initialTutor.id], {
      state: {
        backTarget: ['/owners', this.initialTutor.id, 'next-steps'],
        backLabel: 'Volver a siguientes pasos',
      },
    });
  }
}
