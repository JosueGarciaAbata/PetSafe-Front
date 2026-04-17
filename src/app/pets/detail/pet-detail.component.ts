import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogAdminApiService } from '@app/catalogs/admin/api/catalog-admin-api.service';
import { CatalogAdminItem } from '@app/catalogs/admin/models/catalog-admin.model';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AuthService } from '@app/core/auth/auth.service';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { EncountersApiService } from '@app/encounters/api/encounters-api.service';
import { InitializeVaccinationPlanModalComponent } from '../vaccination/initialize-vaccination-plan-modal.component';
import {
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
  PetRecentConsultationActivityApiResponse,
  PetProcedureHistoryApiResponse,
} from '../models/pet-detail.model';
import {
  PetSurgeryApiResponse,
  PetSurgeryStatus,
  UpsertPetSurgeryRequest,
} from '../models/pet-surgery.model';
import { PetsApiService } from '../services/pets-api.service';
import {
  InitializePatientVaccinationPlanRequest,
  PatientVaccinationPlan,
} from '../vaccination/models/patient-vaccination-plan.model';
import { PatientVaccinationApiService } from '../vaccination/services/patient-vaccination-api.service';
import { buildVaccinationCoverageToneClasses } from '../vaccination/vaccination-tone.util';
import { PetSurgeryModalComponent } from '../components/pet-surgery-modal.component';
import { QueueApiService } from '@app/queue/api/queue-api.service';
import { QueueEntryRecord } from '@app/queue/models/queue.model';
import { QueueEntryDetailModalComponent } from '@app/queue/components/queue-entry-detail-modal.component';

type PetDetailTab = 'OVERVIEW' | 'SURGERIES' | 'PROCEDURES' | 'ACTIVITY';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    InitializeVaccinationPlanModalComponent,
    PetSurgeryModalComponent,
    QueueEntryDetailModalComponent,
  ],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent implements OnInit {
  private readonly petsApi = inject(PetsApiService);
  private readonly catalogAdminApi = inject(CatalogAdminApiService);
  private readonly vaccinationApi = inject(PatientVaccinationApiService);
  private readonly queueApi = inject(QueueApiService);
  private readonly encountersApi = inject(EncountersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private requestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/pets'];
  protected backLabel = 'Volver a mascotas';
  protected activeTab: PetDetailTab = 'OVERVIEW';
  protected readonly detailTabs: Array<{ id: PetDetailTab; label: string }> = [
    { id: 'OVERVIEW', label: 'Resumen' },
    { id: 'SURGERIES', label: 'Cirugías' },
    { id: 'PROCEDURES', label: 'Procedimientos' },
    { id: 'ACTIVITY', label: 'Actividad reciente' },
  ];
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
      this.isRecentConsultationModalOpen = false;
      this.selectedRecentConsultationEntry = null;
      this.recentConsultationLoadingEncounterId = null;
      this.activeTab = 'OVERVIEW';
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
  protected isSurgeryModalOpen = false;
  protected isSavingSurgery = false;
  protected surgerySubmitError: string | null = null;
  protected surgeryCatalog: CatalogAdminItem[] = [];
  protected isSurgeryCatalogLoading = false;
  protected editingSurgery: PetSurgeryApiResponse | null = null;
  protected isRecentConsultationModalOpen = false;
  protected selectedRecentConsultationEntry: QueueEntryRecord | null = null;
  protected recentConsultationLoadingEncounterId: number | null = null;

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

  protected setActiveTab(tab: PetDetailTab): void {
    this.activeTab = tab;
  }

  protected isActiveTab(tab: PetDetailTab): boolean {
    return this.activeTab === tab;
  }

  protected canManageSurgeries(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ', 'RECEPCIONISTA']);
  }

  protected openCreateSurgeryModal(): void {
    if (!this.pet || !this.canManageSurgeries()) {
      return;
    }

    this.editingSurgery = null;
    this.surgerySubmitError = null;
    this.isSurgeryModalOpen = true;
    void this.ensureSurgeryCatalogLoaded();
    this.cdr.detectChanges();
  }

  protected openEditSurgeryModal(surgery: PetSurgeryApiResponse): void {
    if (!this.canEditProfileSurgery(surgery)) {
      return;
    }

    this.editingSurgery = surgery;
    this.surgerySubmitError = null;
    this.isSurgeryModalOpen = true;
    void this.ensureSurgeryCatalogLoaded();
    this.cdr.detectChanges();
  }

  protected closeSurgeryModal(): void {
    if (this.isSavingSurgery) {
      return;
    }

    this.isSurgeryModalOpen = false;
    this.editingSurgery = null;
    this.surgerySubmitError = null;
    this.cdr.detectChanges();
  }

  protected async submitSurgery(payload: UpsertPetSurgeryRequest): Promise<void> {
    if (!this.pet || this.isSavingSurgery) {
      return;
    }

    this.isSavingSurgery = true;
    this.surgerySubmitError = null;
    this.cdr.detectChanges();

    try {
      if (this.editingSurgery) {
        await firstValueFrom(
          this.petsApi.updateProfileSurgery(this.pet.id, this.editingSurgery.id, payload),
        );
      } else {
        await firstValueFrom(this.petsApi.createProfileSurgery(this.pet.id, payload));
      }

      await this.reloadCurrentPet();
      this.toast.success(
        this.editingSurgery ? 'Cirugía actualizada correctamente.' : 'Cirugía registrada correctamente.',
      );
      this.isSurgeryModalOpen = false;
      this.editingSurgery = null;
    } catch (error: unknown) {
      this.surgerySubmitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar la cirugía.',
      });
    } finally {
      this.isSavingSurgery = false;
      this.cdr.detectChanges();
    }
  }

  protected async deleteProfileSurgery(surgery: PetSurgeryApiResponse): Promise<void> {
    if (!this.pet || !this.canEditProfileSurgery(surgery) || this.isSavingSurgery) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la cirugía "${surgery.surgeryType}" del perfil de ${this.pet.name}?`,
    );
    if (!confirmed) {
      return;
    }

    this.isSavingSurgery = true;
    this.cdr.detectChanges();

    try {
      await firstValueFrom(this.petsApi.deleteProfileSurgery(this.pet.id, surgery.id));
      await this.reloadCurrentPet();
      this.toast.success('Cirugía eliminada correctamente.');
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo eliminar la cirugía.',
        }),
      );
    } finally {
      this.isSavingSurgery = false;
      this.cdr.detectChanges();
    }
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

  protected surgeryHistory(): PetSurgeryApiResponse[] {
    return this.pet?.surgeries ?? [];
  }

  protected profileManagedSurgeries(): PetSurgeryApiResponse[] {
    return this.surgeryHistory().filter((item) => item.encounterId === null);
  }

  protected encounterLinkedSurgeries(): PetSurgeryApiResponse[] {
    return this.surgeryHistory().filter((item) => item.encounterId !== null);
  }

  protected hasSurgeryHistory(): boolean {
    return this.surgeryHistory().length > 0;
  }

  protected canEditProfileSurgery(item: PetSurgeryApiResponse): boolean {
    return this.canManageSurgeries() && item.encounterId === null;
  }

  protected buildSurgeryStatusLabel(status: PetSurgeryStatus | string): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'PROGRAMADA':
        return 'Programada';
      case 'EN_CURSO':
        return 'En curso';
      case 'FINALIZADA':
        return 'Finalizada';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return status;
    }
  }

  protected buildSurgerySourceLabel(item: PetSurgeryApiResponse): string {
    return item.isExternal || item.encounterId === null ? 'Externa' : 'Desde atención';
  }

  protected buildSurgeryDateLabel(item: PetSurgeryApiResponse): string {
    if (item.performedDate) {
      return `Realizada ${item.performedDate.slice(0, 10)}`;
    }

    if (item.scheduledDate) {
      return `Programada ${item.scheduledDate.slice(0, 10)}`;
    }

    return 'Sin fecha registrada';
  }

  protected buildSurgeryStatusClasses(status: PetSurgeryStatus | string): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'FINALIZADA':
        return 'ps-tone ps-tone--success ps-tone-surface';
      case 'PROGRAMADA':
        return 'ps-tone ps-tone--info ps-tone-surface';
      case 'EN_CURSO':
        return 'ps-tone ps-tone--warning ps-tone-surface';
      case 'CANCELADA':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      default:
        return 'rounded-full border border-border bg-background text-text-secondary';
    }
  }

  protected recentConsultations(): PetRecentConsultationActivityApiResponse[] {
    return this.pet?.recentActivity?.consultations ?? [];
  }

  protected procedureHistory(): PetProcedureHistoryApiResponse[] {
    return this.pet?.procedures ?? [];
  }

  protected hasRecentConsultations(): boolean {
    return this.recentConsultations().length > 0;
  }

  protected hasProcedureHistory(): boolean {
    return this.procedureHistory().length > 0;
  }

  protected recentActivityWindowLabel(): string {
    const start = this.pet?.recentActivity?.windowStart;
    return start ? `Último mes · desde ${start.slice(0, 10)}` : 'Último mes';
  }

  protected buildEncounterStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'ACTIVA':
        return 'Activa';
      case 'REACTIVADA':
        return 'Reactivada';
      case 'FINALIZADA':
        return 'Finalizada';
      case 'ANULADA':
        return 'Anulada';
      default:
        return status?.trim() || 'Sin estado';
    }
  }

  protected buildEncounterStatusClasses(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'FINALIZADA':
        return 'ps-tone ps-tone--success ps-tone-surface';
      case 'ACTIVA':
      case 'REACTIVADA':
        return 'ps-tone ps-tone--info ps-tone-surface';
      case 'ANULADA':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      default:
        return 'rounded-full border border-border bg-background text-text-secondary';
    }
  }

  protected buildRecentConsultationMeta(item: PetRecentConsultationActivityApiResponse): string {
    const clinician = item.clinicianName?.trim() || 'Sin MVZ registrado';
    const reason = item.consultationReason?.trim();
    return reason ? `${clinician} · ${reason}` : clinician;
  }

  protected buildRecentConsultationTitle(
    item: PetRecentConsultationActivityApiResponse,
  ): string {
    return `Consulta del paciente #${item.patientConsultationNumber}`;
  }

  protected buildProcedureHistoryMeta(item: PetProcedureHistoryApiResponse): string {
    return item.clinicianName?.trim() || 'Sin MVZ registrado';
  }

  protected isRecentConsultationLoading(
    item: PetRecentConsultationActivityApiResponse,
  ): boolean {
    return this.recentConsultationLoadingEncounterId === item.id;
  }

  protected async openRecentConsultationDetail(
    item: PetRecentConsultationActivityApiResponse,
  ): Promise<void> {
    if (this.recentConsultationLoadingEncounterId !== null) {
      return;
    }

    this.recentConsultationLoadingEncounterId = item.id;
    this.cdr.detectChanges();

    try {
      this.selectedRecentConsultationEntry = await firstValueFrom(
        this.queueApi.getEntryByEncounter(item.id),
      );
      this.isRecentConsultationModalOpen = true;
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo abrir el detalle operativo de la consulta.',
        }),
      );
    } finally {
      this.recentConsultationLoadingEncounterId = null;
      this.cdr.detectChanges();
    }
  }

  protected closeRecentConsultationModal(): void {
    this.isRecentConsultationModalOpen = false;
    this.selectedRecentConsultationEntry = null;
    this.cdr.detectChanges();
  }

  protected viewEncounterFromRecentConsultation(entry: QueueEntryRecord): void {
    this.closeRecentConsultationModal();

    if (entry.encounter) {
      void this.router.navigate(['/encounters', entry.encounter.id], {
        state: {
          backTarget: ['/pets', this.pet?.id ?? entry.patient.id],
          backLabel: 'Volver al perfil',
        },
      });
    }
  }

  protected async reactivateRecentConsultation(entry: QueueEntryRecord): Promise<void> {
    if (!entry.encounter) {
      return;
    }

    try {
      const encounter = await firstValueFrom(this.encountersApi.reactivate(entry.encounter.id));
      this.closeRecentConsultationModal();
      void this.router.navigate(['/encounters', encounter.id], {
        state: {
          backTarget: ['/pets', this.pet?.id ?? entry.patient.id],
          backLabel: 'Volver al perfil',
        },
      });
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo reactivar la consulta clínica desde el perfil del paciente.',
        }),
      );
    }
  }

  protected vaccinationCoveragePercent(): number {
    return Math.round(this.vaccinationPlan?.coverage.coveragePercent ?? 0);
  }

  protected vaccinationCoverageToneClasses(): string {
    return buildVaccinationCoverageToneClasses(this.vaccinationPlan);
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
      void this.ensureSurgeryCatalogLoaded();
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

  private async ensureSurgeryCatalogLoaded(): Promise<void> {
    if (this.isSurgeryCatalogLoading || this.surgeryCatalog.length > 0) {
      return;
    }

    this.isSurgeryCatalogLoading = true;
    this.cdr.detectChanges();

    try {
      this.surgeryCatalog = await firstValueFrom(this.catalogAdminApi.listSurgeries(false));
    } catch {
      this.surgeryCatalog = [];
    } finally {
      this.isSurgeryCatalogLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async reloadCurrentPet(): Promise<void> {
    if (!this.pet) {
      return;
    }

    this.pet = await firstValueFrom(this.petsApi.getBasicById(this.pet.id));
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
