import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PetsApiService } from '../services/pets-api.service';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
import { EditPetModalComponent } from './edit-pet-modal.component';

@Component({
  selector: 'app-pet-edit-page',
  standalone: true,
  imports: [EditPetModalComponent],
  templateUrl: './pet-edit-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly petsApi = inject(PetsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private detailBackTarget: readonly (string | number)[] = ['/pets'];
  private detailBackLabel = 'Volver a mascotas';

  protected pet: PetBasicDetailApiResponse | null = null;
  protected isLoading = true;
  protected loadError: string | null = null;

  ngOnInit(): void {
    const petId = this.route.snapshot.paramMap.get('id');
    if (!petId) {
      void this.router.navigate(['/pets']);
      return;
    }

    this.detailBackTarget = history.state?.detailBackTarget ?? ['/pets'];
    this.detailBackLabel = history.state?.detailBackLabel?.trim() || 'Volver a mascotas';
    void this.loadPet(petId);
  }

  protected close(): void {
    const petId = this.route.snapshot.paramMap.get('id');
    void this.router.navigate(petId ? ['/pets', petId] : ['/pets'], {
      replaceUrl: true,
      state: {
        backTarget: this.detailBackTarget,
        backLabel: this.detailBackLabel,
      },
    });
  }

  protected save(): void {
    this.close();
  }

  private async loadPet(petId: string): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    try {
      this.pet = await firstValueFrom(this.petsApi.getBasicById(petId));
    } catch {
      this.loadError = 'No se pudo cargar la mascota.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
