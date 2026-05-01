import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogAdminApiService } from '@app/catalogs/admin/api/catalog-admin-api.service';
import { CatalogAdminItem } from '@app/catalogs/admin/models/catalog-admin.model';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AuthService } from '@app/core/auth/auth.service';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { EncountersApiService } from '@app/encounters/api/encounters-api.service';
import { ClinicalCasesApiService } from '@app/clinical-cases/api/clinical-cases-api.service';
import {
  ClinicalCaseDetail,
  ClinicalCaseSummary,
} from '@app/clinical-cases/models/clinical-case.model';
import { InitializeVaccinationPlanModalComponent } from '../vaccination/initialize-vaccination-plan-modal.component';
import {
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
  PetRecentActivityApiResponse,
  PetRecentConsultationActivityApiResponse,
  PetProcedureHistoryApiResponse,
  PetTreatmentHistoryApiResponse,
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
import { CreateAppointmentModalComponent } from '@app/appointments/components/create-appointment-modal.component';

type PetDetailTab = 'OVERVIEW' | 'SURGERIES' | 'TREATMENTS' | 'PROCEDURES' | 'CASES' | 'ACTIVITY';

const PET_DETAIL_TAB_QUERY_PARAM = 'tab';
const PET_DETAIL_CASE_QUERY_PARAM = 'caseId';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InitializeVaccinationPlanModalComponent,
    PetSurgeryModalComponent,
    QueueEntryDetailModalComponent,
    CreateAppointmentModalComponent,
  ],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('qrCanvas') qrCanvasRef?: ElementRef<HTMLCanvasElement>;
  private readonly petsApi = inject(PetsApiService);
  private readonly catalogAdminApi = inject(CatalogAdminApiService);
  private readonly vaccinationApi = inject(PatientVaccinationApiService);
  private readonly queueApi = inject(QueueApiService);
  private readonly encountersApi = inject(EncountersApiService);
  private readonly clinicalCasesApi = inject(ClinicalCasesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private requestVersion = 0;
  private readonly clinicalCaseDetailCache = new Map<number, ClinicalCaseDetail>();
  private currentPetId: number | null = null;
  private backTarget: readonly (string | number)[] = ['/pets'];
  protected backLabel = 'Volver a mascotas';
  protected activeTab: PetDetailTab = 'OVERVIEW';
  protected showQrPanel = false;

  protected toggleQrPanel(): void {
    this.showQrPanel = !this.showQrPanel;
    this.cdr.markForCheck();
  }

  protected closeQrPanel(): void {
    this.showQrPanel = false;
    this.cdr.markForCheck();
  }
  protected readonly detailTabs: Array<{ id: PetDetailTab; label: string }> = [
    { id: 'OVERVIEW', label: 'Resumen' },
    { id: 'SURGERIES', label: 'Cirugías' },
    { id: 'TREATMENTS', label: 'Tratamientos' },
    { id: 'PROCEDURES', label: 'Procedimientos' },
    { id: 'CASES', label: 'Casos clínicos' },
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

      const parsedPetId = Number.parseInt(petId, 10);
      this.currentPetId = Number.isFinite(parsedPetId) ? parsedPetId : null;
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
      this.activityData = null;
      this.isActivityLoading = false;
      this.activityLoadError = null;
      this.activityDateFrom = '';
      this.activityDateTo = '';
      this.selectedClinicalCaseId = null;
      this.selectedClinicalCaseDetail = null;
      this.clinicalCaseDetailError = null;
      this.clinicalCaseLoadingId = null;
      this.clinicalCaseDetailCache.clear();
      this.activeTab = 'OVERVIEW';
      this.cdr.detectChanges();
      void this.loadPet(petId, requestToken);
      void this.loadVaccinationPlan(petId, requestToken);
    });
  }

  protected isLoading = false;
  protected loadError: string | null = null;
  protected pet: PetBasicDetailApiResponse | null = null;
  protected qrDataUrl: string | null = null;
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
  protected activityData: PetRecentActivityApiResponse | null = null;
  protected isActivityLoading = false;
  protected activityLoadError: string | null = null;
  protected activityDateFrom = '';
  protected activityDateTo = '';
  protected selectedClinicalCaseId: number | null = null;
  protected selectedClinicalCaseDetail: ClinicalCaseDetail | null = null;
  protected clinicalCaseLoadingId: number | null = null;
  protected clinicalCaseDetailError: string | null = null;
  protected isClinicalCaseFollowUpModalOpen = false;
  protected clinicalCaseFollowUpError: string | null = null;
  protected isClinicalCaseFollowUpSubmitting = false;
  protected isConsultationCaseLinkModalOpen = false;
  protected consultationCaseLinkError: string | null = null;
  protected isConsultationCaseLinkSubmitting = false;
  protected consultationToLink: PetRecentConsultationActivityApiResponse | null = null;
  protected consultationCaseLinkMode: 'EXISTING' | 'NEW' = 'EXISTING';
  protected consultationCaseId: number | null = null;
  protected consultationProblemSummary = '';

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
    this.persistPetDetailViewState();

    if (tab === 'CASES' && this.clinicalCases().length > 0) {
      const targetCaseId = this.selectedClinicalCaseId ?? this.clinicalCases()[0].id;
      if (this.selectedClinicalCaseId !== targetCaseId || !this.selectedClinicalCaseDetail) {
        void this.selectClinicalCase(targetCaseId);
      }
    }
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
    return this.activityData?.consultations ?? [];
  }

  protected procedureHistory(): PetProcedureHistoryApiResponse[] {
    return this.pet?.procedures ?? [];
  }

  protected treatmentHistory(): PetTreatmentHistoryApiResponse[] {
    return this.pet?.treatments ?? [];
  }

  protected hasRecentConsultations(): boolean {
    return this.recentConsultations().length > 0;
  }

  protected hasTreatmentHistory(): boolean {
    return this.treatmentHistory().length > 0;
  }

  protected hasProcedureHistory(): boolean {
    return this.procedureHistory().length > 0;
  }

  protected clinicalCases(): ClinicalCaseSummary[] {
    return this.pet?.clinicalCases ?? [];
  }

  protected hasClinicalCases(): boolean {
    return this.clinicalCases().length > 0;
  }

  protected isClinicalCaseSelected(caseId: number): boolean {
    return this.selectedClinicalCaseId === caseId;
  }

  protected selectedClinicalCaseSummary(): ClinicalCaseSummary | null {
    if (!this.selectedClinicalCaseId) {
      return null;
    }

    return this.clinicalCases().find((item) => item.id === this.selectedClinicalCaseId) ?? null;
  }

  protected buildClinicalCaseStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'ABIERTO':
        return 'Abierto';
      case 'CERRADO':
        return 'Resuelto';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return 'Sin estado';
    }
  }

  protected buildClinicalCaseStatusClasses(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'ABIERTO':
        return 'ps-tone ps-tone--info ps-tone-surface';
      case 'CERRADO':
        return 'ps-tone ps-tone--success ps-tone-surface';
      case 'CANCELADO':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      default:
        return 'rounded-full border border-border bg-background text-text-secondary';
    }
  }

  protected buildTreatmentEvolutionLabel(eventType: string | null | undefined): string {
    switch ((eventType ?? '').trim().toUpperCase()) {
      case 'CONTINUA':
        return 'Continuado';
      case 'SUSPENDE':
        return 'Suspendido';
      case 'FINALIZA':
        return 'Finalizado';
      case 'REEMPLAZA':
        return 'Reemplazado';
      default:
        return 'Sin evolución';
    }
  }

  protected buildTreatmentEvolutionClasses(eventType: string | null | undefined): string {
    switch ((eventType ?? '').trim().toUpperCase()) {
      case 'CONTINUA':
        return 'ps-tone ps-tone--info ps-tone-surface';
      case 'SUSPENDE':
        return 'ps-tone ps-tone--warning ps-tone-surface';
      case 'FINALIZA':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      case 'REEMPLAZA':
        return 'ps-tone ps-tone--attention ps-tone-surface';
      default:
        return 'rounded-full border border-border bg-background text-text-secondary';
    }
  }

  protected buildCaseTreatmentStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'FINALIZADO':
        return 'Finalizado';
      case 'SUSPENDIDO':
        return 'Suspendido';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return 'Activo';
    }
  }

  protected buildCaseTreatmentStatusClasses(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'FINALIZADO':
        return 'ps-tone ps-tone--success ps-tone-surface';
      case 'SUSPENDIDO':
        return 'ps-tone ps-tone--warning ps-tone-surface';
      case 'CANCELADO':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      default:
        return 'ps-tone ps-tone--info ps-tone-surface';
    }
  }

  protected recentActivityWindowLabel(): string {
    if (!this.activityData) {
      return 'Sin rango cargado';
    }

    return `${this.activityData.windowStart.slice(0, 10)} · ${this.activityData.windowEnd.slice(0, 10)}`;
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

  protected buildTreatmentHistoryMeta(item: PetTreatmentHistoryApiResponse): string {
    const parts = [
      `Consulta #${item.patientConsultationNumber}`,
      `Inicio ${item.startDate.slice(0, 10)}`,
    ];
    if (item.clinicalCaseProblem?.trim()) {
      parts.push(item.clinicalCaseProblem.trim());
    }

    return parts.join(' · ');
  }

  protected openTreatmentDetail(treatmentId: number): void {
    if (!this.pet) {
      return;
    }

    void this.router.navigate(['/treatments', treatmentId], {
      state: {
        backTarget: ['/pets', this.pet.id],
        backLabel: 'Volver al detalle de mascota',
      },
    });
  }

  protected setActivityRangePresetToLastMonth(): void {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    this.activityDateFrom = this.toDateInputValue(start);
    this.activityDateTo = this.toDateInputValue(end);
  }

  protected async applyActivityFilters(): Promise<void> {
    if (!this.pet || this.isActivityLoading) {
      return;
    }

    await this.loadActivity(this.pet.id, this.requestVersion, {
      from: this.activityDateFrom || null,
      to: this.activityDateTo || null,
    });
  }

  protected async resetActivityFilters(): Promise<void> {
    if (!this.pet || this.isActivityLoading) {
      return;
    }

    this.setActivityRangePresetToLastMonth();
    await this.loadActivity(this.pet.id, this.requestVersion, {
      from: this.activityDateFrom,
      to: this.activityDateTo,
    });
  }

  protected isRecentConsultationLoading(
    item: PetRecentConsultationActivityApiResponse,
  ): boolean {
    return this.recentConsultationLoadingEncounterId === item.id;
  }

  protected async selectClinicalCase(caseId: number): Promise<void> {
    if (this.clinicalCaseLoadingId !== null && this.clinicalCaseLoadingId !== caseId) {
      return;
    }

    this.selectedClinicalCaseId = caseId;
    this.activeTab = 'CASES';
    this.clinicalCaseDetailError = null;
    this.persistPetDetailViewState();

    const cached = this.clinicalCaseDetailCache.get(caseId);
    if (cached) {
      this.selectedClinicalCaseDetail = cached;
      this.cdr.detectChanges();
      return;
    }

    this.clinicalCaseLoadingId = caseId;
    this.cdr.detectChanges();

    try {
      const detail = await firstValueFrom(this.clinicalCasesApi.getById(caseId));
      this.clinicalCaseDetailCache.set(caseId, detail);
      if (this.selectedClinicalCaseId === caseId) {
        this.selectedClinicalCaseDetail = detail;
      }
    } catch (error: unknown) {
      if (this.selectedClinicalCaseId === caseId) {
        this.selectedClinicalCaseDetail = null;
        this.clinicalCaseDetailError = resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo cargar el detalle del caso clínico.',
        });
      }
    } finally {
      if (this.clinicalCaseLoadingId === caseId) {
        this.clinicalCaseLoadingId = null;
      }
      this.cdr.detectChanges();
    }
  }

  protected canScheduleSelectedClinicalCase(): boolean {
    return this.selectedClinicalCaseDetail?.status === 'ABIERTO';
  }

  protected openClinicalCaseFollowUpModal(): void {
    if (!this.pet || !this.selectedClinicalCaseDetail || !this.canScheduleSelectedClinicalCase()) {
      return;
    }

    this.clinicalCaseFollowUpError = null;
    this.isClinicalCaseFollowUpModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeClinicalCaseFollowUpModal(): void {
    if (this.isClinicalCaseFollowUpSubmitting) {
      return;
    }

    this.isClinicalCaseFollowUpModalOpen = false;
    this.clinicalCaseFollowUpError = null;
    this.cdr.detectChanges();
  }

  protected async submitClinicalCaseFollowUp(payload: {
    scheduledDate: string;
    scheduledTime: string;
    endTime: string;
    notes?: string | null;
  }): Promise<void> {
    if (!this.selectedClinicalCaseDetail || this.isClinicalCaseFollowUpSubmitting) {
      return;
    }

    this.isClinicalCaseFollowUpSubmitting = true;
    this.clinicalCaseFollowUpError = null;
    this.cdr.detectChanges();

    try {
      const detail = await firstValueFrom(
        this.clinicalCasesApi.scheduleFollowUp(this.selectedClinicalCaseDetail.id, {
          scheduledDate: payload.scheduledDate,
          scheduledTime: payload.scheduledTime,
          endTime: payload.endTime,
          notes: payload.notes ?? null,
        }),
      );

      this.clinicalCaseDetailCache.set(detail.id, detail);
      this.selectedClinicalCaseDetail = detail;
      this.isClinicalCaseFollowUpModalOpen = false;
      await this.reloadCurrentPet();
      this.toast.success('Control clínico programado correctamente.');
    } catch (error: unknown) {
      this.clinicalCaseFollowUpError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo programar el control del caso clínico.',
      });
    } finally {
      this.isClinicalCaseFollowUpSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  protected canLinkConsultationToCase(item: PetRecentConsultationActivityApiResponse): boolean {
    return item.clinicalCaseId === null;
  }

  protected openConsultationCaseLinkModal(item: PetRecentConsultationActivityApiResponse): void {
    if (!this.canLinkConsultationToCase(item)) {
      return;
    }

    this.consultationToLink = item;
    this.consultationCaseLinkError = null;
    this.consultationProblemSummary = '';
    const openCases = this.clinicalCases().filter((clinicalCase) => clinicalCase.status === 'ABIERTO');
    this.consultationCaseLinkMode = openCases.length > 0 ? 'EXISTING' : 'NEW';
    this.consultationCaseId = openCases[0]?.id ?? null;
    this.isConsultationCaseLinkModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeConsultationCaseLinkModal(): void {
    if (this.isConsultationCaseLinkSubmitting) {
      return;
    }

    this.isConsultationCaseLinkModalOpen = false;
    this.consultationCaseLinkError = null;
    this.consultationToLink = null;
    this.consultationProblemSummary = '';
    this.cdr.detectChanges();
  }

  protected selectConsultationCaseLinkMode(mode: 'EXISTING' | 'NEW'): void {
    this.consultationCaseLinkMode = mode;
    if (mode === 'EXISTING') {
      this.consultationProblemSummary = '';
      this.consultationCaseId = this.clinicalCases().find((item) => item.status === 'ABIERTO')?.id ?? null;
    } else {
      this.consultationCaseId = null;
    }
  }

  protected async submitConsultationCaseLink(): Promise<void> {
    if (!this.consultationToLink || this.isConsultationCaseLinkSubmitting) {
      return;
    }

    if (this.consultationCaseLinkMode === 'EXISTING' && !this.consultationCaseId) {
      this.consultationCaseLinkError = 'Selecciona un caso clínico abierto.';
      this.cdr.detectChanges();
      return;
    }

    if (
      this.consultationCaseLinkMode === 'NEW'
      && !this.consultationProblemSummary.trim()
    ) {
      this.consultationCaseLinkError = 'Resume el problema clínico para abrir el caso nuevo.';
      this.cdr.detectChanges();
      return;
    }

    this.isConsultationCaseLinkSubmitting = true;
    this.consultationCaseLinkError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.encountersApi.updateClinicalCaseLink(this.consultationToLink.id, {
          mode: this.consultationCaseLinkMode,
          clinicalCaseId:
            this.consultationCaseLinkMode === 'EXISTING'
              ? (this.consultationCaseId ?? undefined)
              : undefined,
          problemSummary:
            this.consultationCaseLinkMode === 'NEW'
              ? this.consultationProblemSummary.trim()
              : undefined,
        }),
      );

      await this.reloadCurrentPet();
      this.isConsultationCaseLinkModalOpen = false;
      this.consultationToLink = null;
      this.toast.success('La consulta se vinculó correctamente al caso clínico.');

      if (updated.clinicalCaseSummary?.id) {
        await this.selectClinicalCase(updated.clinicalCaseSummary.id);
        this.setActiveTab('CASES');
      }
    } catch (error: unknown) {
      this.consultationCaseLinkError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo vincular la consulta al caso clínico.',
      });
    } finally {
      this.isConsultationCaseLinkSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  protected async openRecentConsultationDetail(
    item: PetRecentConsultationActivityApiResponse,
  ): Promise<void> {
    await this.openEncounterOperationalDetail(item.id);
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

  protected isClinicalCaseLoading(caseId: number): boolean {
    return this.clinicalCaseLoadingId === caseId;
  }

  protected async openCaseConsultationDetail(encounterId: number): Promise<void> {
    await this.openEncounterOperationalDetail(encounterId);
  }

  protected isEncounterOperationalDetailLoading(encounterId: number): boolean {
    return this.recentConsultationLoadingEncounterId === encounterId;
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

  ngAfterViewInit(): void {}

  protected petQrUrl(): string {
    if (!this.pet?.qrToken) return '';
    return `${environment.frontendUrl}/mascota/${this.pet.qrToken}`;
  }

  protected downloadQr(): void {
    if (!this.qrDataUrl || !this.pet) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `qr-${this.pet.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
  }

  private async generateQr(): Promise<void> {
    const url = this.petQrUrl();
    if (!url) return;

    try {
      const QRCode = await import('qrcode');
      this.qrDataUrl = await QRCode.default.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
      this.cdr.detectChanges();
    } catch {
      this.qrDataUrl = null;
    }
  }

  private async loadPet(petId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.petsApi.getBasicById(petId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.pet = response;
      this.activityData = response.recentActivity ?? null;
      if (this.activityData) {
        this.activityDateFrom = this.activityData.windowStart.slice(0, 10);
        this.activityDateTo = this.activityData.windowEnd.slice(0, 10);
      } else {
        this.setActivityRangePresetToLastMonth();
      }
      this.restorePetDetailViewState(Number(response.id));
      void this.ensureSurgeryCatalogLoaded();
      void this.generateQr();
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
    this.activityData = this.pet.recentActivity ?? this.activityData;
    this.syncPetDetailViewStateAfterReload();
  }

  private restorePetDetailViewState(petId: number): void {
    const queryTab = this.parsePetDetailTab(this.route.snapshot.queryParamMap.get(PET_DETAIL_TAB_QUERY_PARAM));
    const queryCaseId = this.parsePositiveNumber(
      this.route.snapshot.queryParamMap.get(PET_DETAIL_CASE_QUERY_PARAM),
    );
    const storedState = this.readStoredPetDetailViewState(petId);
    const availableCases = this.clinicalCases();

    this.activeTab = queryTab ?? storedState?.tab ?? 'OVERVIEW';

    const preferredCaseId = queryCaseId ?? storedState?.caseId ?? null;
    const validCaseId = preferredCaseId !== null && availableCases.some((item) => item.id === preferredCaseId)
      ? preferredCaseId
      : null;

    this.selectedClinicalCaseId =
      validCaseId ?? (this.activeTab === 'CASES' && availableCases.length > 0 ? availableCases[0].id : null);
    this.selectedClinicalCaseDetail = this.selectedClinicalCaseId
      ? (this.clinicalCaseDetailCache.get(this.selectedClinicalCaseId) ?? null)
      : null;

    this.persistPetDetailViewState();

    if (this.activeTab === 'CASES' && this.selectedClinicalCaseId) {
      void this.selectClinicalCase(this.selectedClinicalCaseId);
    }
  }

  private syncPetDetailViewStateAfterReload(): void {
    if (!this.pet) {
      return;
    }

    const availableCases = this.clinicalCases();
    if (
      this.selectedClinicalCaseId !== null
      && !availableCases.some((item) => item.id === this.selectedClinicalCaseId)
    ) {
      this.selectedClinicalCaseId = null;
      this.selectedClinicalCaseDetail = null;
      this.clinicalCaseDetailError = null;
    }

    if (this.activeTab === 'CASES' && this.selectedClinicalCaseId === null && availableCases.length > 0) {
      void this.selectClinicalCase(availableCases[0].id);
      return;
    }

    this.persistPetDetailViewState();
  }

  private persistPetDetailViewState(): void {
    if (!this.currentPetId) {
      return;
    }

    localStorage.setItem(
      this.petDetailViewStorageKey(this.currentPetId),
      JSON.stringify({
        tab: this.activeTab,
        caseId: this.selectedClinicalCaseId,
      }),
    );

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [PET_DETAIL_TAB_QUERY_PARAM]: this.activeTab,
        [PET_DETAIL_CASE_QUERY_PARAM]:
          this.activeTab === 'CASES' ? this.selectedClinicalCaseId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private readStoredPetDetailViewState(
    petId: number,
  ): { tab: PetDetailTab; caseId: number | null } | null {
    const rawValue = localStorage.getItem(this.petDetailViewStorageKey(petId));
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as { tab?: string; caseId?: number | null };
      const tab = this.parsePetDetailTab(parsed.tab ?? null);
      return tab
        ? {
            tab,
            caseId: this.parsePositiveNumber(parsed.caseId),
          }
        : null;
    } catch {
      return null;
    }
  }

  private parsePetDetailTab(value: string | null): PetDetailTab | null {
    const normalized = (value ?? '').trim().toUpperCase();
    return this.detailTabs.some((item) => item.id === normalized)
      ? (normalized as PetDetailTab)
      : null;
  }

  private parsePositiveNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private petDetailViewStorageKey(petId: number): string {
    return `pet-detail-view:${petId}`;
  }

  private async loadActivity(
    petId: number | string,
    requestToken: number,
    range?: { from?: string | null; to?: string | null },
  ): Promise<void> {
    this.isActivityLoading = true;
    this.activityLoadError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.petsApi.getActivity(petId, range));
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.activityData = response;
      this.activityDateFrom = response.windowStart.slice(0, 10);
      this.activityDateTo = response.windowEnd.slice(0, 10);
    } catch (error: unknown) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.activityLoadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la actividad clínica del paciente.',
      });
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isActivityLoading = false;
      this.cdr.detectChanges();
    }
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async openEncounterOperationalDetail(encounterId: number): Promise<void> {
    if (this.recentConsultationLoadingEncounterId !== null) {
      return;
    }

    this.recentConsultationLoadingEncounterId = encounterId;
    this.cdr.detectChanges();

    try {
      this.selectedRecentConsultationEntry = await firstValueFrom(
        this.queueApi.getEntryByEncounter(encounterId),
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
