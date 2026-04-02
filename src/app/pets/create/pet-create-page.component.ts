import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import { CreatePetModalComponent } from './create-pet-modal.component';

@Component({
  selector: 'app-pet-create-page',
  standalone: true,
  imports: [RouterLink, CreatePetModalComponent],
  templateUrl: './pet-create-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetCreatePageComponent {
  private readonly router = inject(Router);

  protected readonly initialTutor =
    (history.state as { initialTutor?: ClientTutorBasicApiResponse | null } | null)?.initialTutor ??
    null;

  protected close(): void {
    void this.router.navigate(['/pets']);
  }

  protected save(): void {
    void this.router.navigate(['/pets']);
  }
}
