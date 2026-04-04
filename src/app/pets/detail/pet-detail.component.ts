import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AuthService } from '@app/core/auth/auth.service';
import { InitializeVaccinationPlanModalComponent } from '../vaccination/initialize-vaccination-plan-modal.component';
import {
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
} from '../models/pet-detail.model';
import { PetsApiService } from '../services/pets-api.service';
import {
  InitializePatientVaccinationPlanRequest,
  PatientVaccinationPlan,
} from '../vaccination/models/patient-vaccination-plan.model';
import { PatientVaccinationApiService } from '../vaccination/services/patient-vaccination-api.service';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [InitializeVaccinationPlanModalComponent],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent implements OnInit {
  private readonly petsApi = inject(PetsApiService);
  private readonly vaccinationApi = inject(PatientVaccinationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
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
      this.isVaccinationLoading = true;
      this.vaccinationLoadError = null;
      this.vaccinationPlan = null;
      this.hasMissingVaccinationPlan = false;
      this.cdr.detectChanges();
      void this.loadPet(petId, requestToken);
      void this.loadVaccinationPlan(petId, requestToken);
    });
  }

  protected isLoading = false;
  protected loadError: string | null = null;
  protected pet: PetBasicDetailApiResponse | null = null;
  protected isVaccinationLoading = false;
  protected vaccinationLoadError: string | null = null;
  protected vaccinationPlan: PatientVaccinationPlan | null = null;
  protected hasMissingVaccinationPlan = false;
  protected isGeneratingVaccinationPlan = false;
  protected isInitializePlanModalOpen = false;
  protected initializePlanSubmitError: string | null = null;

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

  protected openVaccinationPage(): void {
    if (!this.pet) {
      return;
    }

    void this.router.navigate(['/pets', this.pet.id, 'vaccination'], {
      state: {
        backTarget: ['/pets', this.pet.id],
        backLabel: 'Volver al detalle',
      },
    });
  }

  protected canGenerateVaccinationPlan(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected openInitializeVaccinationPlanModal(): void {
    if (!this.pet || this.isGeneratingVaccinationPlan) {
      return;
    }

    this.isInitializePlanModalOpen = true;
    this.initializePlanSubmitError = null;
    this.cdr.detectChanges();
  }

  protected closeInitializeVaccinationPlanModal(): void {
    if (this.isGeneratingVaccinationPlan) {
      return;
    }

    this.isInitializePlanModalOpen = false;
    this.initializePlanSubmitError = null;
    this.cdr.detectChanges();
  }

  protected async generateVaccinationPlan(
    payload: InitializePatientVaccinationPlanRequest,
  ): Promise<void> {
    if (!this.pet || this.isGeneratingVaccinationPlan) {
      return;
    }

    this.isGeneratingVaccinationPlan = true;
    this.vaccinationLoadError = null;
    this.initializePlanSubmitError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.vaccinationApi.initializePatientVaccinationPlan(this.pet.id, payload),
      );

      this.vaccinationPlan = this.normalizePlan(response);
      this.hasMissingVaccinationPlan = false;
      this.isInitializePlanModalOpen = false;
    } catch (error: unknown) {
      const resolvedMessage = this.resolveVaccinationPlanOperationError(error, {
        defaultMessage: 'No se pudo generar el plan vacunal.',
      });
      this.initializePlanSubmitError = resolvedMessage;
      this.vaccinationLoadError = resolvedMessage;
    } finally {
      this.isGeneratingVaccinationPlan = false;
      this.cdr.detectChanges();
    }
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

  protected vaccinationCoveragePercent(): number {
    return Math.round(this.vaccinationPlan?.coverage.coveragePercent ?? 0);
  }

  protected vaccinationAlerts(): string[] {
    return this.vaccinationPlan?.alerts ?? [];
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

  private async loadVaccinationPlan(
    petId: string,
    requestToken: number,
  ): Promise<void> {
    try {
      const response = await firstValueFrom(this.vaccinationApi.getPatientPlan(petId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.vaccinationPlan = this.normalizePlan(response);
      this.hasMissingVaccinationPlan = false;
    } catch (error: unknown) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      if (this.isMissingVaccinationPlanError(error)) {
        this.hasMissingVaccinationPlan = true;
        this.vaccinationLoadError = null;
      } else {
        this.vaccinationLoadError = resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo cargar el plan vacunal.',
        });
      }
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isVaccinationLoading = false;
      this.cdr.detectChanges();
    }
  }

  private normalizePlan(plan: PatientVaccinationPlan): PatientVaccinationPlan {
    return {
      ...plan,
      doses: [...plan.doses].sort((left, right) => left.doseOrder - right.doseOrder),
      applications: [...plan.applications].sort((left, right) =>
        right.applicationDate.localeCompare(left.applicationDate),
      ),
    };
  }

  private isMissingVaccinationPlanError(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse
      && error.status === 404
      && resolveApiErrorMessage(error, { defaultMessage: '' })
        .toLowerCase()
        .includes('no tiene plan vacunal generado')
    );
  }

  private resolveVaccinationPlanOperationError(
    error: unknown,
    options: { defaultMessage: string },
  ): string {
    const message = resolveApiErrorMessage(error, options);
    const normalized = message.toLowerCase();

    if (normalized.includes('null value in column "vaccine_id"') || normalized.includes('vaccine_id')) {
      return 'El esquema seleccionado tiene una o más dosis sin vacuna asociada. Revisa la versión vigente del esquema antes de generar o cambiar el plan.';
    }

    return message;
  }
}
