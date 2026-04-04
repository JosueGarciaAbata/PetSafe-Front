import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { UsersApiService } from '@app/core/users/users-api.service';
import {
  UserProfileApiResponse,
  VeterinarianSummaryApiResponse,
} from '@app/core/users/users.model';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
import { PetsApiService } from '../services/pets-api.service';
import { CreateVaccineApplicationModalComponent } from './create-vaccine-application-modal.component';
import {
  CreatePatientVaccineApplicationRequest,
  PatientVaccineRecord,
  PatientVaccinationPlan,
  PatientVaccinationPlanDose,
  PatientVaccinationDoseStatus,
  VaccineCatalogItem,
} from './models/patient-vaccination-plan.model';
import { PatientVaccinationApiService } from './services/patient-vaccination-api.service';

@Component({
  selector: 'app-pet-vaccination-page',
  standalone: true,
  imports: [
    CommonModule,
    ShellIconComponent,
    CreateVaccineApplicationModalComponent,
  ],
  templateUrl: './pet-vaccination-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetVaccinationPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly petsApi = inject(PetsApiService);
  private readonly vaccinationApi = inject(PatientVaccinationApiService);
  private readonly authService = inject(AuthService);
  private readonly usersApi = inject(UsersApiService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private requestVersion = 0;
  private productsRequestVersion = 0;
  private doctorsRequestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/pets'];

  protected backLabel = 'Volver a mascotas';
  protected pet: PetBasicDetailApiResponse | null = null;
  protected plan: PatientVaccinationPlan | null = null;
  protected isLoadingPet = false;
  protected isLoadingPlan = false;
  protected petLoadError: string | null = null;
  protected planLoadError: string | null = null;

  protected isApplicationModalOpen = false;
  protected isLoadingProducts = false;
  protected productsLoadError: string | null = null;
  protected applicationSubmitError: string | null = null;
  protected isSubmittingApplication = false;
  protected vaccineProducts: VaccineCatalogItem[] = [];
  protected isLoadingDoctors = false;
  protected doctorsLoadError: string | null = null;
  protected veterinarianOptions: VeterinarianSummaryApiResponse[] = [];
  protected initialDoctorSelection: VeterinarianSummaryApiResponse | null = null;
  protected currentUserProfile: UserProfileApiResponse | null = null;
  protected quickApplicationDose: PatientVaccinationPlanDose | null = null;
  protected initialApplicationProduct: VaccineCatalogItem | null = null;
  protected initialApplicationDateValue: string | null = null;
  protected initialNextDoseDateValue: string | null = null;

  ngOnInit(): void {
    void this.loadCurrentUserProfile();

    const navigationState = history.state as {
      backTarget?: readonly (string | number)[] | null;
      backLabel?: string | null;
    } | null;

    this.route.paramMap.subscribe((params) => {
      const petId = params.get('id');
      if (!petId) {
        void this.router.navigate(['/pets']);
        return;
      }

      this.backTarget = navigationState?.backTarget ?? ['/pets', Number(petId)];
      this.backLabel = navigationState?.backLabel?.trim() || 'Volver al detalle';

      const requestToken = ++this.requestVersion;
      this.isLoadingPet = true;
      this.isLoadingPlan = true;
      this.petLoadError = null;
      this.planLoadError = null;
      this.pet = null;
      this.plan = null;
      this.cdr.detectChanges();

      void this.loadPet(petId, requestToken);
      void this.loadPlan(petId, requestToken);
    });
  }

  protected canManageApplications(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected canSelectDoctor(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  protected goBack(): void {
    void this.router.navigate(this.backTarget, { replaceUrl: true });
  }

  protected openApplicationModal(dose: PatientVaccinationPlanDose | null = null): void {
    void this.prepareApplicationModal(dose);
  }

  protected canQuickApplyDose(dose: PatientVaccinationPlanDose): boolean {
    return this.canManageApplications() && dose.status !== 'APLICADA' && dose.status !== 'BLOQUEADA';
  }

  protected quickApplyDose(dose: PatientVaccinationPlanDose): void {
    void this.prepareApplicationModal(dose);
  }

  protected onDoctorSearchRequested(search: string): void {
    if (!this.canSelectDoctor() || !this.isApplicationModalOpen) {
      return;
    }

    void this.loadVeterinarians(search);
  }

  private async prepareApplicationModal(dose: PatientVaccinationPlanDose | null = null): Promise<void> {
    if (!this.canManageApplications()) {
      return;
    }

    if (!this.pet) {
      return;
    }

    if (!this.currentUserProfile) {
      await this.loadCurrentUserProfile();
    }

    const speciesId = this.pet.species?.id ?? this.plan?.scheme.species.id ?? null;
    if (!speciesId) {
      this.toast.info('No se pudo identificar la especie de la mascota para cargar vacunas.');
      return;
    }

    this.isApplicationModalOpen = true;
    this.isLoadingProducts = true;
    this.isLoadingDoctors = false;
    this.productsLoadError = null;
    this.doctorsLoadError = null;
    this.applicationSubmitError = null;
    this.vaccineProducts = [];
    this.veterinarianOptions = [];
    this.quickApplicationDose = dose;
    this.initialDoctorSelection = this.buildCurrentVeterinarianSummary();
    this.initialApplicationProduct = this.buildQuickProductPlaceholder(dose);
    this.initialApplicationDateValue = this.buildSuggestedApplicationDate(dose);
    this.initialNextDoseDateValue = this.buildSuggestedNextDoseDate(
      dose,
      this.initialApplicationDateValue,
    );
    this.cdr.detectChanges();
    void this.loadProducts(speciesId);

    if (this.canSelectDoctor()) {
      this.isLoadingDoctors = true;
      this.cdr.detectChanges();
      void this.loadVeterinarians();
    } else if (!this.initialDoctorSelection) {
      this.doctorsLoadError =
        'Tu usuario no tiene un veterinario asociado para registrar una aplicación interna.';
      this.cdr.detectChanges();
    }
  }

  protected closeApplicationModal(): void {
    if (this.isSubmittingApplication) {
      return;
    }

    this.isApplicationModalOpen = false;
    this.applicationSubmitError = null;
    this.productsLoadError = null;
    this.doctorsLoadError = null;
    this.cdr.detectChanges();
  }

  protected async submitApplication(
    payload: CreatePatientVaccineApplicationRequest,
  ): Promise<void> {
    if (!this.pet) {
      return;
    }

    this.isSubmittingApplication = true;
    this.applicationSubmitError = null;
    this.cdr.detectChanges();

    try {
      const createdApplication = await firstValueFrom(
        this.vaccinationApi.addPatientApplication(this.pet.id, payload),
      );

      try {
        const refreshedPlan = await firstValueFrom(
          this.vaccinationApi.getPatientPlan(this.pet.id),
        );
        this.plan = this.normalizePlan(refreshedPlan);
      } catch (refreshError: unknown) {
        this.toast.info(
          resolveApiErrorMessage(refreshError, {
            defaultMessage:
              'La vacuna se registró, pero no se pudo refrescar el plan vacunal.',
          }),
        );
      }

      this.isApplicationModalOpen = false;
      this.toast.success(this.buildApplicationSuccessMessage(createdApplication));
    } catch (error: unknown) {
      this.applicationSubmitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo registrar la vacuna.',
      });
      this.toast.error(this.applicationSubmitError);
    } finally {
      this.isSubmittingApplication = false;
      this.cdr.detectChanges();
    }
  }

  protected coveragePercent(): number {
    return Math.round(this.plan?.coverage.coveragePercent ?? 0);
  }

  protected alerts(): string[] {
    return this.plan?.alerts ?? [];
  }

  protected doses(): PatientVaccinationPlanDose[] {
    return this.plan?.doses ?? [];
  }

  protected applicationsCount(): number {
    return this.plan?.applications.length ?? 0;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'No registrada';
    }

    return value.slice(0, 10);
  }

  protected formatDoseAgeRange(dose: PatientVaccinationPlanDose): string {
    if (dose.ageStartWeeks === null && dose.ageEndWeeks === null) {
      return 'Edad no definida';
    }

    if (dose.ageStartWeeks !== null && dose.ageEndWeeks !== null) {
      return `${dose.ageStartWeeks} - ${dose.ageEndWeeks} semanas`;
    }

    if (dose.ageStartWeeks !== null) {
      return `Desde ${dose.ageStartWeeks} semanas`;
    }

    return `Hasta ${dose.ageEndWeeks} semanas`;
  }

  protected doseStatusLabel(status: PatientVaccinationDoseStatus): string {
    switch (status) {
      case 'APLICADA':
        return 'Aplicada';
      case 'DESCONOCIDA':
        return 'Desconocida';
      case 'NO_APLICADA':
        return 'No aplicada';
      case 'BLOQUEADA':
        return 'Bloqueada';
      case 'REQUIERE_REVISION':
        return 'Requiere revisión';
      default:
        return status;
    }
  }

  protected doseStatusClasses(status: PatientVaccinationDoseStatus): string {
    switch (status) {
      case 'APLICADA':
        return 'border-[#dcfce7] bg-[#f0fdf4] text-[#166534]';
      case 'NO_APLICADA':
        return 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]';
      case 'DESCONOCIDA':
        return 'border-[#fef3c7] bg-[#fffbeb] text-[#b45309]';
      case 'REQUIERE_REVISION':
        return 'border-[#ffedd5] bg-[#fff7ed] text-[#c2410c]';
      case 'BLOQUEADA':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-border bg-background text-text-secondary';
    }
  }

  private async loadPet(petId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.petsApi.getBasicById(petId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.pet = response;
    } catch (error: unknown) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.petLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la mascota.',
      });
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoadingPet = false;
      this.cdr.detectChanges();
    }
  }

  private async loadPlan(petId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.vaccinationApi.getPatientPlan(petId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.plan = this.normalizePlan(response);
    } catch (error: unknown) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.planLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el plan vacunal.',
      });
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoadingPlan = false;
      this.cdr.detectChanges();
    }
  }

  private async loadProducts(speciesId: number): Promise<void> {
    const requestToken = ++this.productsRequestVersion;

    try {
      const response = await firstValueFrom(this.vaccinationApi.listProducts(speciesId));

      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.vaccineProducts = response.filter((item) => item.isActive);
      this.initialApplicationProduct = this.resolveInitialProductSelection();
    } catch (error: unknown) {
      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.productsLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el catálogo de vacunas.',
      });
    } finally {
      if (requestToken !== this.productsRequestVersion) {
        return;
      }

      this.isLoadingProducts = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCurrentUserProfile(): Promise<void> {
    try {
      this.currentUserProfile = await firstValueFrom(this.usersApi.getMe());
    } catch {
      this.currentUserProfile = null;
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async loadVeterinarians(search?: string): Promise<void> {
    const requestToken = ++this.doctorsRequestVersion;

    try {
      const response = await firstValueFrom(this.usersApi.listVeterinarians(search));

      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      const merged = new Map<number, VeterinarianSummaryApiResponse>();

      for (const veterinarian of response) {
        merged.set(veterinarian.id, veterinarian);
      }

      const currentVeterinarian = this.buildCurrentVeterinarianSummary();
      if (currentVeterinarian) {
        merged.set(currentVeterinarian.id, currentVeterinarian);
      }

      const options = Array.from(merged.values()).sort((left, right) =>
        left.fullName.localeCompare(right.fullName),
      );
      this.veterinarianOptions = options;

      const currentEmployeeId = this.currentUserProfile?.employeeId ?? null;
      if (currentEmployeeId) {
        const matchedCurrentVeterinarian =
          options.find((item) => item.id === currentEmployeeId) ?? null;

        if (matchedCurrentVeterinarian) {
          this.initialDoctorSelection = matchedCurrentVeterinarian;
        }
      }
    } catch (error: unknown) {
      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      this.doctorsLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la lista de veterinarios.',
      });
    } finally {
      if (requestToken !== this.doctorsRequestVersion) {
        return;
      }

      this.isLoadingDoctors = false;
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

  private buildCurrentVeterinarianSummary(): VeterinarianSummaryApiResponse | null {
    if (!this.currentUserProfile?.isVeterinarian || !this.currentUserProfile.employeeId) {
      return null;
    }

    const firstName = this.currentUserProfile.person?.firstName?.trim() ?? '';
    const lastName = this.currentUserProfile.person?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      id: this.currentUserProfile.employeeId,
      personId: this.currentUserProfile.person?.id ?? 0,
      fullName: fullName || this.currentUserProfile.email,
      documentId: null,
      code: null,
      professionalRegistration: null,
    };
  }

  private buildApplicationSuccessMessage(application: PatientVaccineRecord): string {
    const vaccineName = application.vaccineName?.trim();
    return vaccineName
      ? `Vacuna registrada correctamente: ${vaccineName}.`
      : 'Vacuna registrada correctamente.';
  }

  private resolveInitialProductSelection(): VaccineCatalogItem | null {
    if (!this.quickApplicationDose) {
      return null;
    }

    return (
      this.vaccineProducts.find((item) => item.id === this.quickApplicationDose?.vaccineId)
      ?? this.buildQuickProductPlaceholder(this.quickApplicationDose)
    );
  }

  private buildQuickProductPlaceholder(
    dose: PatientVaccinationPlanDose | null,
  ): VaccineCatalogItem | null {
    if (!dose) {
      return null;
    }

    const species = this.pet?.species ?? this.plan?.scheme.species ?? null;
    if (!species) {
      return null;
    }

    return {
      id: dose.vaccineId,
      name: dose.vaccineName,
      species,
      isRevaccination: false,
      isActive: true,
    };
  }

  private buildSuggestedApplicationDate(dose: PatientVaccinationPlanDose | null): string {
    const today = this.getTodayDateKey();
    if (!dose?.expectedDate) {
      return today;
    }

    const expectedDate = dose.expectedDate.slice(0, 10);
    return expectedDate <= today ? expectedDate : today;
  }

  private buildSuggestedNextDoseDate(
    dose: PatientVaccinationPlanDose | null,
    applicationDate: string,
  ): string | null {
    if (!dose || !this.plan) {
      return null;
    }

    const today = this.getTodayDateKey();
    const nextDose = this.plan.doses
      .filter((item) => item.doseOrder > dose.doseOrder)
      .sort((left, right) => left.doseOrder - right.doseOrder)[0] ?? null;

    if (!nextDose) {
      return null;
    }

    const expected = nextDose.expectedDate?.slice(0, 10) ?? null;
    if (expected && expected > applicationDate && expected >= today) {
      return expected;
    }

    if (nextDose.intervalDays && nextDose.intervalDays > 0) {
      const calculated = this.addDays(applicationDate, nextDose.intervalDays);
      if (calculated > applicationDate && calculated >= today) {
        return calculated;
      }
    }

    return null;
  }

  private addDays(dateKey: string, days: number): string {
    const base = new Date(`${dateKey}T00:00:00`);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }

  private getTodayDateKey(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
