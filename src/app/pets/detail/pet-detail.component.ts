import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
} from '../models/pet-detail.model';
import { PetsApiService } from '../services/pets-api.service';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent implements OnInit {
  private readonly petsApi = inject(PetsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/pets'];
  protected backLabel = 'Volver a mascotas';
  // El control de relaciones tutor-mascota ya existe y quedó desacoplado
  // en `detail/components/pet-tutors-relations.component` para futuro uso.

  ngOnInit(): void {
    const navigationState = history.state as {
      backTarget?: readonly (string | number)[] | null;
      backLabel?: string | null;
    } | null;
    this.backTarget = navigationState?.backTarget ?? ['/pets'];
    this.backLabel = navigationState?.backLabel?.trim() || 'Volver a mascotas';

    this.route.paramMap.subscribe((params) => {
      const petId = params.get('id');
      if (!petId) {
        void this.router.navigate(['/pets']);
        return;
      }

      const requestToken = ++this.requestVersion;
      this.isLoading = true;
      this.loadError = null;
      this.pet = null;
      this.cdr.detectChanges();
      void this.loadPet(petId, requestToken);
    });
  }

  protected isLoading = false;
  protected loadError: string | null = null;
  protected pet: PetBasicDetailApiResponse | null = null;

  protected goBack(): void {
    void this.router.navigate(this.backTarget, { replaceUrl: true });
  }

  protected openEditPetPage(): void {
    if (!this.pet) {
      return;
    }

    void this.router.navigate(['/pets', this.pet.id, 'edit'], {
      state: {
        detailBackTarget: this.backTarget,
        detailBackLabel: this.backLabel,
      },
    });
  }

  protected buildPetInitial(): string {
    return this.pet?.name.trim().charAt(0).toUpperCase() || 'P';
  }

  protected petImageUrl(): string | null {
    return this.pet?.image?.url?.trim() || null;
  }

  protected petImageAlt(): string {
    return this.pet ? `Foto de ${this.pet.name}` : 'Foto de mascota';
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

    return `${this.pet.ageYears} ${this.pet.ageYears === 1 ? 'año' : 'años'}`;
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
