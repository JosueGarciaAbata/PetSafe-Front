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
    ownerBackTarget?: readonly (string | number)[] | null;
    ownerBackLabel?: string | null;
  } | null;

  protected readonly initialTutor = this.navigationState?.initialTutor ?? null;
  protected readonly ownerBackTarget = this.navigationState?.ownerBackTarget ?? null;
  protected readonly ownerBackLabel = this.navigationState?.ownerBackLabel?.trim() || 'Volver al tutor';

  protected close(): void {
    if (this.ownerBackTarget) {
      void this.router.navigate(this.ownerBackTarget);
      return;
    }

    void this.router.navigate(['/pets']);
  }

  protected save(createdPet: PetCreateResponseApiResponse): void {
    void this.router.navigate(['/pets', createdPet.id], {
      state: {
        backTarget: this.ownerBackTarget ?? ['/pets'],
        backLabel: this.ownerBackTarget ? this.ownerBackLabel : 'Volver a mascotas',
      },
    });
  }

  protected buildBackLabel(): string {
    if (this.ownerBackTarget) {
      return this.ownerBackLabel;
    }

    return 'Volver a mascotas';
  }
}
