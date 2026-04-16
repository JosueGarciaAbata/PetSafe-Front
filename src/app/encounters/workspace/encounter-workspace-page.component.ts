import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { PetBasicDetailApiResponse } from '@app/pets/models/pet-detail.model';
import { PetsApiService } from '@app/pets/services/pets-api.service';
import { CreateVaccineApplicationModalComponent } from '@app/pets/vaccination/create-vaccine-application-modal.component';
import {
  CreatePatientVaccineApplicationRequest,
  PatientVaccinationPlan,
  VaccineCatalogItem,
} from '@app/pets/vaccination/models/patient-vaccination-plan.model';
import { PatientVaccinationApiService } from '@app/pets/vaccination/services/patient-vaccination-api.service';
import { ConfirmDialogComponent } from '@app/shared/confirm-dialog/confirm-dialog.component';
import { ShellIconComponent } from '../../shell/shell-icon.component';
import { EncountersApiService } from '../api/encounters-api.service';
import {
  AppetiteStatus,
  CreateEncounterProcedureRequest,
  CreateEncounterTreatmentRequest,
  CreateEncounterVaccinationRequest,
  EncounterAnamnesis,
  EncounterClinicalExam,
  EncounterClinicalImpression,
  EncounterDetail,
  EncounterEnvironmentalData,
  EncounterPlan,
  HydrationStatus,
  MucosaStatus,
  ProcedureCatalogItem,
  WaterIntakeStatus,
} from '../models/encounter.model';
import {
  CLINICAL_SHORT_TEXT_MAX_LENGTH,
  CLINICAL_TEXT_MAX_LENGTH,
  ENCOUNTER_TAB_LABELS,
  ENCOUNTER_TAB_ORDER,
  TAB_BY_BLOCK,
} from './encounter-workspace.constants';
import {
  ClinicalBlock,
  ClinicalTabView,
  PendingProcedureDraft,
  PendingTreatmentDraft,
  PendingVaccinationDraft,
  TabMeta,
  TabStatus,
  TabView,
  TreatmentItemDraft,
} from './encounter-workspace.types';

@Component({
  selector: 'app-encounter-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ShellIconComponent,
    ConfirmDialogComponent,
    CreateVaccineApplicationModalComponent,
  ],
  templateUrl: './encounter-workspace-page.component.html',
  styleUrl: './encounter-workspace-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterWorkspacePageComponent implements OnInit {
  private readonly encountersApi = inject(EncountersApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly patientVaccinationApi = inject(PatientVaccinationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly tabByBlock = TAB_BY_BLOCK;
  private readonly suppressFormTracking = { value: false };

  protected encounter: EncounterDetail | null = null;
  protected patientDetail: PetBasicDetailApiResponse | null = null;
  protected patientVaccinationPlan: PatientVaccinationPlan | null = null;
  protected availableVaccines: VaccineCatalogItem[] = [];
  protected procedureCatalog: ProcedureCatalogItem[] = [];
  protected hasMissingVaccinationPlan = false;

  protected isLoading = true;
  protected isLoadingPatientContext = false;
  protected isLoadingReferenceData = false;
  protected isFinishConfirmOpen = false;
  protected isSubmittingAction = false;
  protected isSavingAll = false;
  protected savingSection: ClinicalBlock | null = null;
  protected activeTab: TabView = 'REASON';
  protected loadError: string | null = null;
  protected actionError: string | null = null;
  protected sectionError: string | null = null;
  protected patientContextError: string | null = null;
  protected vaccinationError: string | null = null;
  protected treatmentError: string | null = null;
  protected procedureError: string | null = null;

  protected isVaccinationModalOpen = false;
  protected isTreatmentModalOpen = false;
  protected isProcedureModalOpen = false;
  protected pendingVaccinations: PendingVaccinationDraft[] = [];
  protected pendingTreatments: PendingTreatmentDraft[] = [];
  protected pendingProcedures: PendingProcedureDraft[] = [];
  protected readonly clinicalTextMaxLength = CLINICAL_TEXT_MAX_LENGTH;
  protected readonly clinicalShortTextMaxLength = CLINICAL_SHORT_TEXT_MAX_LENGTH;
  protected readonly tabOrder = ENCOUNTER_TAB_ORDER;
  protected readonly tabLabels = ENCOUNTER_TAB_LABELS;
  protected readonly tabState: Record<TabView, TabMeta> = {
    REASON: { status: 'clean', error: null },
    ANAMNESIS: { status: 'clean', error: null },
    EXAM: { status: 'clean', error: null },
    ENVIRONMENT: { status: 'clean', error: null },
    IMPRESSION: { status: 'clean', error: null },
    ACTIONS: { status: 'clean', error: null },
    PLAN: { status: 'clean', error: null },
  };

  protected readonly appetiteOptions: readonly AppetiteStatus[] = [
    'NORMAL',
    'AUMENTADO',
    'DISMINUIDO',
    'ANOREXIA',
  ];
  protected readonly waterIntakeOptions: readonly WaterIntakeStatus[] = [
    'NORMAL',
    'POLIDIPSIA',
    'ADIPSIA',
  ];
  protected readonly mucosaOptions: readonly MucosaStatus[] = [
    'ROSADAS',
    'PALIDAS',
    'ICTERICAS',
    'CIANOTICAS',
    'CONGESTIVAS',
  ];
  protected readonly hydrationOptions: readonly HydrationStatus[] = [
    'NORMAL',
    'DESHIDRATACION_LEVE',
    'DESHIDRATACION_MODERADA',
    'DESHIDRATACION_SEVERA',
  ];

  protected readonly reasonForm = new FormGroup({
    consultationReason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    currentIllnessHistory: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    referredPreviousDiagnoses: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    referredPreviousTreatments: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly anamnesisForm = new FormGroup({
    problemStartText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    previousSurgeriesText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    howProblemStartedText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    vaccinesUpToDate: new FormControl<boolean | null>(null),
    dewormingUpToDate: new FormControl<boolean | null>(null),
    hasPetAtHome: new FormControl<boolean | null>(null),
    petAtHomeDetail: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    administeredMedicationText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    appetiteStatus: new FormControl<AppetiteStatus | null>(null),
    waterIntakeStatus: new FormControl<WaterIntakeStatus | null>(null),
    fecesText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    vomitText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    numberOfBowelMovements: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    urineText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    respiratoryProblemsText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    difficultyWalkingText: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    notes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly examForm = new FormGroup({
    weightKg: new FormControl<number | null>(null, {
      validators: [Validators.min(0.01)],
    }),
    temperatureC: new FormControl<number | null>(null),
    pulse: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    heartRate: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    respiratoryRate: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    mucousMembranes: new FormControl<MucosaStatus | null>(null),
    lymphNodes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_SHORT_TEXT_MAX_LENGTH)],
    }),
    hydration: new FormControl<HydrationStatus | null>(null),
    crtSeconds: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    examNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly environmentForm = new FormGroup({
    environmentNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    nutritionNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    lifestyleNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    feedingTypeNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    notes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly impressionForm = new FormGroup({
    presumptiveDiagnosis: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    differentialDiagnosis: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    prognosis: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_SHORT_TEXT_MAX_LENGTH)],
    }),
    clinicalNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly planForm = new FormGroup({
    clinicalPlan: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    requiresFollowUp: new FormControl<boolean | null>(false),
    suggestedFollowUpDate: new FormControl(''),
    planNotes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly vaccinationForm = new FormGroup({
    vaccineId: new FormControl<number | null>(null),
    applicationDate: new FormControl(this.todayDate()),
    suggestedNextDate: new FormControl(''),
    notes: new FormControl(''),
  });

  protected readonly treatmentForm = new FormGroup({
    startDate: new FormControl(this.todayDate()),
    endDate: new FormControl(''),
    generalInstructions: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected readonly procedureForm = new FormGroup({
    catalogId: new FormControl<number | null>(null),
    procedureType: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_SHORT_TEXT_MAX_LENGTH)],
    }),
    performedDate: new FormControl(this.nowDateTimeLocal()),
    description: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    result: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    notes: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
  });

  protected treatmentItems: TreatmentItemDraft[] = [this.createEmptyTreatmentItem()];

  ngOnInit(): void {
    this.configurePlanValidation();
    this.setupFormTracking();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.loadError = 'ID de consulta no proporcionado.';
      this.isLoading = false;
      return;
    }

    void this.loadEncounter(id);
  }

  protected setTab(tab: TabView): void {
    this.activeTab = tab;
  }

  protected async saveReason(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'reason',
      this.encountersApi.updateReason(this.encounter.id, this.reasonForm.getRawValue()),
      'No se pudo guardar el motivo de consulta.',
    );
  }

  protected async saveAnamnesis(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'anamnesis',
      this.encountersApi.updateAnamnesis(this.encounter.id, this.anamnesisPayload()),
      'No se pudo guardar la anamnesis.',
    );
  }

  protected async saveExam(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'exam',
      this.encountersApi.updateClinicalExam(this.encounter.id, this.examPayload()),
      'No se pudo guardar el examen clínico.',
    );
  }

  protected async saveEnvironment(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'environment',
      this.encountersApi.updateEnvironmentalData(this.encounter.id, this.environmentPayload()),
      'No se pudo guardar el contexto del paciente.',
    );
  }

  protected async saveImpression(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'impression',
      this.encountersApi.updateImpression(this.encounter.id, this.impressionPayload()),
      'No se pudo guardar la impresión clínica.',
    );
  }

  protected async savePlan(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    await this.persistSection(
      'plan',
      this.encountersApi.updatePlan(this.encounter.id, this.planPayload()),
      'No se pudo guardar el plan clínico.',
    );
  }

  protected async saveAllSections(): Promise<void> {
    if (!this.encounter || this.isSavingAll || this.isSubmittingAction) {
      return;
    }

    this.persistPendingActions();
    await this.saveAllProgress(false);
  }

  private async saveAllProgress(fromFinishFlow: boolean): Promise<boolean> {
    if (!this.encounter) {
      return false;
    }

    this.isSavingAll = true;
    this.sectionError = null;
    if (!fromFinishFlow) {
      this.actionError = null;
    }
    this.cdr.detectChanges();

    let firstErrorTab: ClinicalTabView | null = null;

    try {
      for (const step of this.buildClinicalSaveSequence()) {
        if (!this.sectionHasChanges(step.block)) {
          this.setTabMeta(step.tab, {
            status: 'clean',
            error: null,
          });
          continue;
        }

        const validationMessage = this.validateClinicalStep(step.block);
        if (validationMessage) {
          this.setTabMeta(step.tab, {
            status: 'dirty',
            error: validationMessage,
          });
          firstErrorTab ??= step.tab;
          continue;
        }

        this.setTabMeta(step.tab, {
          status: 'saving',
          error: this.tabState[step.tab].error,
        });
        this.cdr.detectChanges();

        try {
          const updated = await firstValueFrom(step.execute());
          this.applyEncounterPreservingUnsavedChanges(updated, step.block);
          if (step.onAfterSave) {
            await step.onAfterSave();
          }
          this.markTabSaved(step.tab);
        } catch (error) {
          this.setTabMeta(step.tab, {
            status: 'error',
            error: resolveApiErrorMessage(error, {
              defaultMessage: step.defaultMessage,
            }),
          });
          firstErrorTab ??= step.tab;
        }
      }

      if (firstErrorTab) {
        this.activeTab = firstErrorTab;
        this.sectionError =
          'Se guardaron algunas secciones, pero todavía hay pestañas con errores que debes revisar.';
        if (fromFinishFlow) {
          this.actionError =
            'No se pudo finalizar porque todavía hay secciones clínicas con errores. Corrige la primera pestaña marcada en rojo.';
        }
        return false;
      }

      this.sectionError = null;
      return true;
    } finally {
      this.isSavingAll = false;
      this.cdr.detectChanges();
    }
  }

  protected openVaccinationModal(): void {
    this.vaccinationError = null;
    this.isVaccinationModalOpen = true;
  }

  protected closeVaccinationModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.isVaccinationModalOpen = false;
  }

  protected submitVaccinationDraft(payload: CreatePatientVaccineApplicationRequest): void {
    const selectedVaccine = this.availableVaccines.find((item) => item.id === payload.vaccineId);
    if (!selectedVaccine || !payload.applicationDate?.trim()) {
      this.vaccinationError = 'Selecciona una vacuna y una fecha de aplicación válida.';
      this.cdr.detectChanges();
      return;
    }

    this.pendingVaccinations = [
      ...this.pendingVaccinations,
      {
        id: this.buildDraftId('vac'),
        vaccineName: selectedVaccine.name,
        applicationDate: payload.applicationDate.trim(),
        suggestedNextDate: payload.nextDoseDate?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
        payload: {
          vaccineId: payload.vaccineId,
          applicationDate: payload.applicationDate.trim(),
          suggestedNextDate: payload.nextDoseDate?.trim() || undefined,
          notes: payload.notes?.trim() || undefined,
        },
      },
    ];
    this.persistPendingActions();
    this.isVaccinationModalOpen = false;
    this.vaccinationError = null;
    this.cdr.detectChanges();
  }

  protected openTreatmentModal(): void {
    this.treatmentError = null;
    this.treatmentForm.reset({
      startDate: this.todayDate(),
      endDate: '',
      generalInstructions: '',
    });
    this.treatmentItems = [this.createEmptyTreatmentItem()];
    this.isTreatmentModalOpen = true;
  }

  protected closeTreatmentModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.isTreatmentModalOpen = false;
  }

  protected addTreatmentItem(): void {
    this.treatmentItems = [...this.treatmentItems, this.createEmptyTreatmentItem()];
  }

  protected removeTreatmentItem(index: number): void {
    if (this.treatmentItems.length === 1) {
      return;
    }

    this.treatmentItems = this.treatmentItems.filter((_, currentIndex) => currentIndex !== index);
  }

  protected updateTreatmentItem(
    index: number,
    field: keyof TreatmentItemDraft,
    value: string | number | null,
  ): void {
    this.treatmentItems = this.treatmentItems.map((item, currentIndex) =>
      currentIndex === index ? { ...item, [field]: value } : item,
    );
  }

  protected submitTreatment(): void {
    const raw = this.treatmentForm.getRawValue();
    const items = this.treatmentItems
      .map((item) => ({
        medication: item.medication.trim().slice(0, 120),
        dose: item.dose.trim().slice(0, 120),
        frequency: item.frequency.trim().slice(0, 120),
        durationDays: item.durationDays ? Number(item.durationDays) : null,
        administrationRoute: item.administrationRoute.trim().slice(0, 120),
        notes: item.notes.trim() || undefined,
      }))
      .filter(
        (item) =>
          item.medication
          || item.dose
          || item.frequency
          || item.durationDays
          || item.administrationRoute,
      );

    const invalidItem = items.some(
      (item) =>
        !item.medication
        || !item.dose
        || !item.frequency
        || !item.durationDays
        || item.durationDays < 1
        || !item.administrationRoute,
    );

    if (!raw.startDate?.trim()) {
      this.treatmentError = 'Indica la fecha de inicio del tratamiento.';
      this.cdr.detectChanges();
      return;
    }

    if (items.length === 0 || invalidItem) {
      this.treatmentError =
        'Agrega al menos un ítem de tratamiento completo con medicamento, dosis, frecuencia, duración y vía.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateEncounterTreatmentRequest = {
      startDate: raw.startDate.trim(),
      endDate: raw.endDate?.trim() || undefined,
      generalInstructions: raw.generalInstructions?.trim() || undefined,
      items: items.map((item) => ({
        medication: item.medication,
        dose: item.dose,
        frequency: item.frequency,
        durationDays: item.durationDays as number,
        administrationRoute: item.administrationRoute,
        notes: item.notes,
      })),
    };

    this.pendingTreatments = [
      ...this.pendingTreatments,
      {
        id: this.buildDraftId('trt'),
        summary: items.map((item) => item.medication).join(', '),
        startDate: payload.startDate,
        endDate: payload.endDate,
        notes: payload.generalInstructions,
        payload,
      },
    ];
    this.persistPendingActions();
    this.treatmentError = null;
    this.isTreatmentModalOpen = false;
    this.cdr.detectChanges();
  }

  protected openProcedureModal(): void {
    this.procedureError = null;
    this.procedureForm.reset({
      catalogId: null,
      procedureType: '',
      performedDate: this.nowDateTimeLocal(),
      description: '',
      result: '',
      notes: '',
    });
    this.isProcedureModalOpen = true;
  }

  protected closeProcedureModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.isProcedureModalOpen = false;
  }

  protected onProcedureCatalogSelected(): void {
    const catalogItem = this.selectedProcedureCatalog();
    if (!catalogItem) {
      return;
    }

    this.procedureForm.patchValue({
      procedureType: this.procedureForm.controls.procedureType.value?.trim() || catalogItem.name,
    });
  }

  protected submitProcedure(): void {
    const raw = this.procedureForm.getRawValue();
    const performedDate = this.toIsoString(raw.performedDate);
    const procedureType = raw.procedureType?.trim() || undefined;

    if (!performedDate) {
      this.procedureError = 'Indica la fecha y hora en que se realizó el procedimiento.';
      this.cdr.detectChanges();
      return;
    }

    if (!raw.catalogId && !procedureType) {
      this.procedureError = 'Selecciona un procedimiento del catálogo o escribe el tipo realizado.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateEncounterProcedureRequest = {
      catalogId: raw.catalogId ?? undefined,
      procedureType: procedureType?.slice(0, 120),
      performedDate,
      description: raw.description?.trim() || undefined,
      result: raw.result?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
    };

    this.pendingProcedures = [
      ...this.pendingProcedures,
      {
        id: this.buildDraftId('prc'),
        procedureName: this.selectedProcedureCatalog()?.name || procedureType || 'Procedimiento',
        performedDate,
        result: payload.result,
        notes: payload.notes || payload.description,
        payload,
      },
    ];
    this.persistPendingActions();
    this.procedureError = null;
    this.isProcedureModalOpen = false;
    this.cdr.detectChanges();
  }

  protected finishEncounter(): void {
    if (!this.encounter) {
      return;
    }

    this.actionError = null;
    this.isFinishConfirmOpen = true;
  }

  protected closeFinishConfirmDialog(): void {
    if (this.isSubmittingAction || this.savingSection !== null) {
      return;
    }

    this.isFinishConfirmOpen = false;
    this.cdr.detectChanges();
  }

  protected async confirmFinishEncounter(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    this.isSubmittingAction = true;
    this.isFinishConfirmOpen = false;
    this.actionError = null;
    this.cdr.detectChanges();

    try {
      const saved = await this.saveAllProgress(true);
      if (!saved) {
        return;
      }

      const executed = await this.executePendingClinicalActions();
      if (!executed) {
        return;
      }

      await firstValueFrom(this.encountersApi.finish(this.encounter.id));
      this.clearPendingActions();
      void this.router.navigate(['/queue']);
    } catch (error) {
      this.actionError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo finalizar la atención médica.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/queue']);
  }

  protected goToPatientVaccination(): void {
    if (!this.encounter) {
      return;
    }

    void this.router.navigate(['/pets', this.encounter.patientId, 'vaccination'], {
      state: {
        backTarget: ['/encounters', this.encounter.id],
        backLabel: 'Volver a la consulta',
      },
    });
  }

  protected primaryTutorName(): string {
    const tutor =
      this.patientDetail?.tutors.find((item) => item.isPrimary) ?? this.patientDetail?.tutors[0];
    return tutor?.fullName?.trim() || 'Sin tutor principal';
  }

  protected primaryTutorPhone(): string {
    const tutor =
      this.patientDetail?.tutors.find((item) => item.isPrimary) ?? this.patientDetail?.tutors[0];
    return tutor?.phone?.trim() || 'Sin teléfono';
  }

  protected patientSexLabel(): string {
    switch (this.patientDetail?.sex) {
      case 'HEMBRA':
        return 'Hembra';
      case 'MACHO':
        return 'Macho';
      default:
        return 'No registrado';
    }
  }

  protected patientAgeLabel(): string {
    if (this.patientDetail?.ageYears !== null && this.patientDetail?.ageYears !== undefined) {
      return this.patientDetail.ageYears === 1 ? '1 año' : `${this.patientDetail.ageYears} años`;
    }

    if (this.patientDetail?.birthDate) {
      return this.formatDate(this.patientDetail.birthDate);
    }

    return 'No registrada';
  }

  protected patientWeightLabel(): string {
    const weight =
      this.examForm.controls.weightKg.value
      ?? this.encounter?.clinicalExam?.weightKg
      ?? this.patientDetail?.currentWeight;

    return weight !== null && weight !== undefined ? `${weight} kg` : 'Sin peso registrado';
  }

  protected patientSterilizedLabel(): string {
    if (this.patientDetail?.sterilized === true) {
      return 'Sí';
    }

    if (this.patientDetail?.sterilized === false) {
      return 'No';
    }

    return 'No registrado';
  }

  protected patientColorLabel(): string {
    return this.patientDetail?.color?.name?.trim() || 'No registrado';
  }

  protected tabLabel(tab: TabView): string {
    return this.tabLabels[tab];
  }

  protected tabStatus(tab: TabView): TabStatus {
    return this.tabState[tab].status;
  }

  protected tabError(tab: TabView): string | null {
    return this.tabState[tab].error;
  }

  protected currentTabError(): string | null {
    return this.tabError(this.activeTab);
  }

  protected tabHasError(tab: TabView): boolean {
    return Boolean(this.tabError(tab));
  }

  protected controlHasError(
    form: FormGroup,
    controlName: string,
  ): boolean {
    const control = form.get(controlName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  protected controlTextLength(
    form: FormGroup,
    controlName: string,
  ): number {
    const value = form.get(controlName)?.value;
    return typeof value === 'string' ? value.length : 0;
  }

  protected textLength(value: string | null | undefined): number {
    return value?.length ?? 0;
  }

  protected controlErrorMessage(tab: ClinicalTabView, controlName: string): string | null {
    const control = this.controlForTab(tab, controlName);
    if (!control || !control.errors || !this.controlHasError(this.formForTab(tab), controlName)) {
      return null;
    }

    if (control.errors['required']) {
      if (tab === 'REASON' && controlName === 'consultationReason') {
        return 'El motivo principal es obligatorio.';
      }
      if (tab === 'PLAN' && controlName === 'suggestedFollowUpDate') {
        return 'La fecha de seguimiento es obligatoria cuando indicas que requiere control.';
      }
    }

    if (control.errors['min']) {
      if (tab === 'EXAM' && controlName === 'weightKg') {
        return 'El peso debe ser mayor a 0.';
      }
      return 'El valor debe ser mayor o igual a 0.';
    }

    if (control.errors['maxlength']) {
      return `No puede superar los ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (control.errors['invalidTodayOrFutureDate']) {
      return 'La fecha sugerida debe ser hoy o futura.';
    }

    return 'Revisa el valor ingresado.';
  }

  protected treatmentItemLength(item: TreatmentItemDraft, field: keyof TreatmentItemDraft): number {
    const value = item[field];
    return typeof value === 'string' ? value.length : 0;
  }

  protected patientImageUrl(): string | null {
    return this.patientDetail?.image?.url ?? null;
  }

  protected patientInitials(): string {
    const name =
      this.patientDetail?.name?.trim() || this.encounter?.patient.name?.trim() || 'Paciente';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? 'P';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase();
  }

  protected vaccinationCoverageLabel(): string {
    if (!this.patientVaccinationPlan) {
      return this.hasMissingVaccinationPlan ? 'Sin plan generado' : 'No disponible';
    }

    return `${this.patientVaccinationPlan.coverage.coveragePercent}% cobertura`;
  }

  protected vaccinationCoverageClass(): string {
    if (!this.patientVaccinationPlan) {
      return 'text-text-secondary';
    }

    if (
      this.patientVaccinationPlan.coverage.blocked > 0
      || this.patientVaccinationPlan.coverage.requiresReview > 0
    ) {
      return 'text-[#c2410c]';
    }

    if (this.patientVaccinationPlan.coverage.coveragePercent >= 80) {
      return 'text-[#166534]';
    }

    return 'text-[#1d4ed8]';
  }

  protected encounterOriginLabel(): string {
    if (this.encounter?.appointmentId && this.encounter.queueEntryId) {
      return 'Cita agendada derivada a atención del día';
    }

    if (this.encounter?.queueEntryId) {
      return 'Ingreso operativo desde atención del día';
    }

    if (this.encounter?.appointmentId) {
      return 'Consulta asociada a una cita';
    }

    return 'Consulta directa';
  }

  protected encounterStatusLabel(): string {
    switch (this.encounter?.status) {
      case 'ACTIVA':
        return 'En atención';
      case 'FINALIZADA':
        return 'Finalizada';
      case 'ANULADA':
        return 'Anulada';
      default:
        return 'Sin estado';
    }
  }

  protected hasPatientNotes(): boolean {
    return Boolean(this.patientDetail?.generalAllergies || this.patientDetail?.generalHistory);
  }

  protected selectedProcedureCatalog(): ProcedureCatalogItem | null {
    const catalogId = this.procedureForm.controls.catalogId.value;
    return this.procedureCatalog.find((item) => item.id === catalogId) ?? null;
  }

  protected buildAppetiteLabel(value: AppetiteStatus | null | undefined): string {
    switch (value) {
      case 'AUMENTADO':
        return 'Aumentado';
      case 'DISMINUIDO':
        return 'Disminuido';
      case 'ANOREXIA':
        return 'Anorexia';
      default:
        return 'Normal';
    }
  }

  protected buildWaterIntakeLabel(value: WaterIntakeStatus | null | undefined): string {
    switch (value) {
      case 'POLIDIPSIA':
        return 'Polidipsia';
      case 'ADIPSIA':
        return 'Adipsia';
      default:
        return 'Normal';
    }
  }

  protected buildMucosaLabel(value: MucosaStatus | null | undefined): string {
    switch (value) {
      case 'PALIDAS':
        return 'Pálidas';
      case 'ICTERICAS':
        return 'Ictéricas';
      case 'CIANOTICAS':
        return 'Cianóticas';
      case 'CONGESTIVAS':
        return 'Congestivas';
      default:
        return 'Rosadas';
    }
  }

  protected buildHydrationLabel(value: HydrationStatus | null | undefined): string {
    switch (value) {
      case 'DESHIDRATACION_LEVE':
        return 'Deshidratación leve';
      case 'DESHIDRATACION_MODERADA':
        return 'Deshidratación moderada';
      case 'DESHIDRATACION_SEVERA':
        return 'Deshidratación severa';
      default:
        return 'Normal';
    }
  }

  protected buildTreatmentStatusLabel(status: string): string {
    switch (status) {
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

  protected buildTreatmentStatusClass(status: string): string {
    switch (status) {
      case 'FINALIZADO':
        return 'bg-[#E8F7F1] text-[#1F7A5A] border border-[#BFE7D6]';
      case 'SUSPENDIDO':
        return 'bg-[#FFF4E0] text-[#995700] border border-[#FFDDAA]';
      case 'CANCELADO':
        return 'bg-[#FFE0E0] text-[#990000] border border-[#FFB8B8]';
      default:
        return 'bg-[#E0F3FF] text-[#005299] border border-[#B8E2FF]';
    }
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  protected pendingActionsCount(): number {
    return (
      this.pendingVaccinations.length + this.pendingTreatments.length + this.pendingProcedures.length
    );
  }

  protected removePendingVaccination(id: string): void {
    this.pendingVaccinations = this.pendingVaccinations.filter((item) => item.id !== id);
    this.persistPendingActions();
  }

  protected removePendingTreatment(id: string): void {
    this.pendingTreatments = this.pendingTreatments.filter((item) => item.id !== id);
    this.persistPendingActions();
  }

  protected removePendingProcedure(id: string): void {
    this.pendingProcedures = this.pendingProcedures.filter((item) => item.id !== id);
    this.persistPendingActions();
  }

  private configurePlanValidation(): void {
    const followUpControl = this.planForm.controls.suggestedFollowUpDate;
    const applyValidators = (requiresFollowUp: boolean): void => {
      followUpControl.setValidators(
        requiresFollowUp ? [Validators.required, this.todayOrFutureDateValidator()] : [],
      );
      followUpControl.updateValueAndValidity({ emitEvent: false });
    };

    applyValidators(this.planForm.controls.requiresFollowUp.value === true);
    this.planForm.controls.requiresFollowUp.valueChanges.subscribe((requiresFollowUp) => {
      applyValidators(requiresFollowUp === true);
    });
  }

  private setupFormTracking(): void {
    const subscriptions: Array<{
      tab: ClinicalTabView;
      form: FormGroup;
    }> = [
      { tab: 'REASON', form: this.reasonForm },
      { tab: 'ANAMNESIS', form: this.anamnesisForm },
      { tab: 'EXAM', form: this.examForm },
      { tab: 'ENVIRONMENT', form: this.environmentForm },
      { tab: 'IMPRESSION', form: this.impressionForm },
      { tab: 'PLAN', form: this.planForm },
    ];

    for (const item of subscriptions) {
      item.form.valueChanges.subscribe(() => {
        if (this.suppressFormTracking.value) {
          return;
        }

        this.setTabMeta(item.tab, {
          status: 'dirty',
          error: this.tabState[item.tab].error,
        });
        this.cdr.markForCheck();
      });
    }
  }

  private buildClinicalSaveSequence(): Array<{
    tab: ClinicalTabView;
    block: ClinicalBlock;
    defaultMessage: string;
    execute: () => ReturnType<EncountersApiService['updateReason']>;
    onAfterSave?: () => Promise<void>;
  }> {
    return [
      {
        tab: 'REASON',
        block: 'reason',
        defaultMessage: 'No se pudo guardar el motivo de consulta.',
        execute: () => this.encountersApi.updateReason(this.encounter!.id, this.reasonPayload()),
      },
      {
        tab: 'ANAMNESIS',
        block: 'anamnesis',
        defaultMessage: 'No se pudo guardar la anamnesis.',
        execute: () => this.encountersApi.updateAnamnesis(this.encounter!.id, this.anamnesisPayload()),
      },
      {
        tab: 'EXAM',
        block: 'exam',
        defaultMessage: 'No se pudo guardar el examen clínico.',
        execute: () => this.encountersApi.updateClinicalExam(this.encounter!.id, this.examPayload()),
        onAfterSave: async () => {
          if (this.encounter) {
            await this.loadPatientContext(this.encounter.patientId);
          }
        },
      },
      {
        tab: 'ENVIRONMENT',
        block: 'environment',
        defaultMessage: 'No se pudo guardar el contexto del paciente.',
        execute: () =>
          this.encountersApi.updateEnvironmentalData(this.encounter!.id, this.environmentPayload()),
      },
      {
        tab: 'IMPRESSION',
        block: 'impression',
        defaultMessage: 'No se pudo guardar la impresión clínica.',
        execute: () => this.encountersApi.updateImpression(this.encounter!.id, this.impressionPayload()),
      },
      {
        tab: 'PLAN',
        block: 'plan',
        defaultMessage: 'No se pudo guardar el plan clínico.',
        execute: () => this.encountersApi.updatePlan(this.encounter!.id, this.planPayload()),
      },
    ];
  }

  private validateClinicalStep(block: ClinicalBlock): string | null {
    const tab = this.tabByBlock[block];
    const form = this.formForTab(tab);
    form.markAllAsTouched();
    form.updateValueAndValidity();

    if (form.valid) {
      return null;
    }

    switch (tab) {
      case 'REASON':
        return this.controlErrorMessage(tab, 'consultationReason')
          ?? 'Completa el motivo principal de la consulta.';
      case 'ANAMNESIS':
        return this.controlErrorMessage(tab, 'numberOfBowelMovements')
          ?? 'Revisa los datos de anamnesis antes de guardar.';
      case 'EXAM':
        return (
          this.controlErrorMessage(tab, 'weightKg')
          ?? this.controlErrorMessage(tab, 'pulse')
          ?? this.controlErrorMessage(tab, 'heartRate')
          ?? this.controlErrorMessage(tab, 'respiratoryRate')
          ?? this.controlErrorMessage(tab, 'crtSeconds')
          ?? 'Revisa los valores del examen clínico antes de guardar.'
        );
      case 'PLAN':
        return (
          this.controlErrorMessage(tab, 'suggestedFollowUpDate')
          ?? 'Revisa los datos de seguimiento antes de guardar.'
        );
      default:
        return 'Revisa los datos de esta sección antes de guardar.';
    }
  }

  private formForTab(
    tab: ClinicalTabView,
  ): FormGroup {
    switch (tab) {
      case 'REASON':
        return this.reasonForm;
      case 'ANAMNESIS':
        return this.anamnesisForm;
      case 'EXAM':
        return this.examForm;
      case 'ENVIRONMENT':
        return this.environmentForm;
      case 'IMPRESSION':
        return this.impressionForm;
      case 'PLAN':
        return this.planForm;
    }
  }

  private controlForTab(tab: ClinicalTabView, controlName: string): AbstractControl | null {
    return this.formForTab(tab).get(controlName);
  }

  private todayOrFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = typeof control.value === 'string' ? control.value.trim() : '';
      if (!raw) {
        return null;
      }

      const candidate = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(candidate.getTime())) {
        return { invalidTodayOrFutureDate: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return candidate >= today ? null : { invalidTodayOrFutureDate: true };
    };
  }

  private setTabMeta(tab: TabView, meta: TabMeta): void {
    this.tabState[tab] = meta;
  }

  private markTabSaved(tab: ClinicalTabView): void {
    this.setTabMeta(tab, {
      status: 'saved',
      error: null,
    });
  }

  private async loadEncounter(id: number): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.patientContextError = null;
    this.cdr.detectChanges();

    try {
      const encounter = await firstValueFrom(this.encountersApi.getById(id));
      this.applyEncounter(encounter);
      this.restorePendingActions(encounter.id);

      await Promise.all([this.loadPatientContext(encounter.patientId), this.loadReferenceData()]);
    } catch (error) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la consulta médica.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadPatientContext(patientId: number): Promise<void> {
    this.isLoadingPatientContext = true;
    this.patientContextError = null;
    this.cdr.detectChanges();

    try {
      const patient = await firstValueFrom(this.petsApi.getBasicById(patientId));
      this.patientDetail = patient;

      if (patient.species?.id) {
        this.availableVaccines = await firstValueFrom(
          this.patientVaccinationApi.listProducts({
            speciesId: patient.species.id,
            onlyActive: true,
          }),
        );
      } else {
        this.availableVaccines = [];
      }

      await this.refreshVaccinationPlan();
    } catch (error) {
      this.patientContextError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el contexto del paciente.',
      });
    } finally {
      this.isLoadingPatientContext = false;
      this.cdr.detectChanges();
    }
  }

  private async loadReferenceData(): Promise<void> {
    this.isLoadingReferenceData = true;
    this.cdr.detectChanges();

    try {
      this.procedureCatalog = await firstValueFrom(this.encountersApi.listProcedureCatalog(false));
    } catch {
      this.procedureCatalog = [];
    } finally {
      this.isLoadingReferenceData = false;
      this.cdr.detectChanges();
    }
  }

  private async refreshVaccinationPlan(): Promise<void> {
    if (!this.encounter) {
      return;
    }

    this.hasMissingVaccinationPlan = false;

    try {
      this.patientVaccinationPlan = await firstValueFrom(
        this.patientVaccinationApi.getPatientPlan(this.encounter.patientId),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.patientVaccinationPlan = null;
        this.hasMissingVaccinationPlan = true;
        return;
      }

      this.patientVaccinationPlan = null;
    }
  }

  private applyEncounter(encounter: EncounterDetail): void {
    this.encounter = encounter;
    this.suppressFormTracking.value = true;

    this.reasonForm.patchValue({
      consultationReason: encounter.consultationReason?.consultationReason ?? '',
      currentIllnessHistory: encounter.consultationReason?.currentIllnessHistory ?? '',
      referredPreviousDiagnoses: encounter.consultationReason?.referredPreviousDiagnoses ?? '',
      referredPreviousTreatments: encounter.consultationReason?.referredPreviousTreatments ?? '',
    });

    this.anamnesisForm.patchValue({
      problemStartText: encounter.anamnesis?.problemStartText ?? '',
      previousSurgeriesText: encounter.anamnesis?.previousSurgeriesText ?? '',
      howProblemStartedText: encounter.anamnesis?.howProblemStartedText ?? '',
      vaccinesUpToDate: encounter.anamnesis?.vaccinesUpToDate ?? null,
      dewormingUpToDate: encounter.anamnesis?.dewormingUpToDate ?? null,
      hasPetAtHome: encounter.anamnesis?.hasPetAtHome ?? null,
      petAtHomeDetail: encounter.anamnesis?.petAtHomeDetail ?? '',
      administeredMedicationText: encounter.anamnesis?.administeredMedicationText ?? '',
      appetiteStatus: encounter.anamnesis?.appetiteStatus ?? null,
      waterIntakeStatus: encounter.anamnesis?.waterIntakeStatus ?? null,
      fecesText: encounter.anamnesis?.fecesText ?? '',
      vomitText: encounter.anamnesis?.vomitText ?? '',
      numberOfBowelMovements: encounter.anamnesis?.numberOfBowelMovements ?? null,
      urineText: encounter.anamnesis?.urineText ?? '',
      respiratoryProblemsText: encounter.anamnesis?.respiratoryProblemsText ?? '',
      difficultyWalkingText: encounter.anamnesis?.difficultyWalkingText ?? '',
      notes: encounter.anamnesis?.notes ?? '',
    });

    this.examForm.patchValue({
      weightKg: encounter.clinicalExam?.weightKg ?? null,
      temperatureC: encounter.clinicalExam?.temperatureC ?? null,
      pulse: encounter.clinicalExam?.pulse ?? null,
      heartRate: encounter.clinicalExam?.heartRate ?? null,
      respiratoryRate: encounter.clinicalExam?.respiratoryRate ?? null,
      mucousMembranes: encounter.clinicalExam?.mucousMembranes ?? null,
      lymphNodes: encounter.clinicalExam?.lymphNodes ?? '',
      hydration: encounter.clinicalExam?.hydration ?? null,
      crtSeconds: encounter.clinicalExam?.crtSeconds ?? null,
      examNotes: encounter.clinicalExam?.examNotes ?? '',
    });

    this.environmentForm.patchValue({
      environmentNotes: encounter.environmentalData?.environmentNotes ?? '',
      nutritionNotes: encounter.environmentalData?.nutritionNotes ?? '',
      lifestyleNotes: encounter.environmentalData?.lifestyleNotes ?? '',
      feedingTypeNotes: encounter.environmentalData?.feedingTypeNotes ?? '',
      notes: encounter.environmentalData?.notes ?? '',
    });

    this.impressionForm.patchValue({
      presumptiveDiagnosis: encounter.clinicalImpression?.presumptiveDiagnosis ?? '',
      differentialDiagnosis: encounter.clinicalImpression?.differentialDiagnosis ?? '',
      prognosis: encounter.clinicalImpression?.prognosis ?? '',
      clinicalNotes: encounter.clinicalImpression?.clinicalNotes ?? '',
    });

    this.planForm.patchValue({
      clinicalPlan: encounter.plan?.clinicalPlan ?? '',
      requiresFollowUp: encounter.plan?.requiresFollowUp ?? false,
      suggestedFollowUpDate: encounter.plan?.suggestedFollowUpDate ?? '',
      planNotes: encounter.plan?.planNotes ?? '',
    });

    this.reasonForm.markAsPristine();
    this.anamnesisForm.markAsPristine();
    this.examForm.markAsPristine();
    this.environmentForm.markAsPristine();
    this.impressionForm.markAsPristine();
    this.planForm.markAsPristine();
    this.suppressFormTracking.value = false;

    this.sectionError = null;
    this.actionError = null;
  }

  private async executePendingClinicalActions(): Promise<boolean> {
    if (!this.encounter) {
      return false;
    }

    try {
      for (const draft of this.pendingVaccinations) {
        const updated = await firstValueFrom(
          this.encountersApi.addVaccination(this.encounter.id, draft.payload),
        );
        this.applyEncounter(updated);
      }

      for (const draft of this.pendingTreatments) {
        const updated = await firstValueFrom(
          this.encountersApi.addTreatment(this.encounter.id, draft.payload),
        );
        this.applyEncounter(updated);
      }

      for (const draft of this.pendingProcedures) {
        const updated = await firstValueFrom(
          this.encountersApi.addProcedure(this.encounter.id, draft.payload),
        );
        this.applyEncounter(updated);
      }

      if (this.pendingVaccinations.length > 0) {
        await this.refreshVaccinationPlan();
      }

      return true;
    } catch (error) {
      this.actionError = resolveApiErrorMessage(error, {
        defaultMessage:
          'No se pudieron ejecutar las acciones clínicas pendientes. La atención sigue abierta para que revises los datos.',
      });
      return false;
    }
  }

  private async persistSection(
    section: ClinicalBlock,
    request: ReturnType<EncountersApiService['updateReason']>,
    defaultMessage: string,
  ): Promise<void> {
    const tab = this.tabByBlock[section];
    if (!this.sectionHasChanges(section)) {
      this.setTabMeta(tab, {
        status: 'clean',
        error: null,
      });
      this.sectionError = null;
      this.cdr.detectChanges();
      return;
    }

    const validationMessage = this.validateClinicalStep(section);
    if (validationMessage) {
      this.setTabMeta(tab, {
        status: 'dirty',
        error: validationMessage,
      });
      this.activeTab = tab;
      this.sectionError = validationMessage;
      this.cdr.detectChanges();
      return;
    }

    this.savingSection = section;
    this.sectionError = null;
    this.setTabMeta(tab, {
      status: 'saving',
      error: this.tabState[tab].error,
    });
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(request);
      this.applyEncounterPreservingUnsavedChanges(updated, section);
      if (section === 'exam' && this.encounter) {
        await this.loadPatientContext(this.encounter.patientId);
      }
      this.markTabSaved(tab);
    } catch (error) {
      const message = resolveApiErrorMessage(error, {
        defaultMessage,
      });
      this.sectionError = message;
      this.setTabMeta(tab, {
        status: 'error',
        error: message,
      });
      this.activeTab = tab;
    } finally {
      this.savingSection = null;
      this.cdr.detectChanges();
    }
  }

  private reasonPayload(): {
    consultationReason: string;
    currentIllnessHistory: string | null;
    referredPreviousDiagnoses: string | null;
    referredPreviousTreatments: string | null;
  } {
    return {
      consultationReason: this.reasonForm.controls.consultationReason.value.trim(),
      currentIllnessHistory: this.trimOrNull(this.reasonForm.controls.currentIllnessHistory.value),
      referredPreviousDiagnoses: this.trimOrNull(
        this.reasonForm.controls.referredPreviousDiagnoses.value,
      ),
      referredPreviousTreatments: this.trimOrNull(
        this.reasonForm.controls.referredPreviousTreatments.value,
      ),
    };
  }

  private anamnesisPayload(): EncounterAnamnesis {
    const raw = this.anamnesisForm.getRawValue();
    return {
      ...raw,
      problemStartText: raw.problemStartText?.trim() || null,
      previousSurgeriesText: raw.previousSurgeriesText?.trim() || null,
      howProblemStartedText: raw.howProblemStartedText?.trim() || null,
      petAtHomeDetail: raw.petAtHomeDetail?.trim() || null,
      administeredMedicationText: raw.administeredMedicationText?.trim() || null,
      fecesText: raw.fecesText?.trim() || null,
      vomitText: raw.vomitText?.trim() || null,
      numberOfBowelMovements: this.normalizeInteger(raw.numberOfBowelMovements),
      urineText: raw.urineText?.trim() || null,
      respiratoryProblemsText: raw.respiratoryProblemsText?.trim() || null,
      difficultyWalkingText: raw.difficultyWalkingText?.trim() || null,
      notes: raw.notes?.trim() || null,
    };
  }

  private examPayload(): EncounterClinicalExam {
    const raw = this.examForm.getRawValue();
    return {
      weightKg: this.normalizeNumber(raw.weightKg),
      temperatureC: this.normalizeNumber(raw.temperatureC),
      pulse: this.normalizeInteger(raw.pulse),
      heartRate: this.normalizeInteger(raw.heartRate),
      respiratoryRate: this.normalizeInteger(raw.respiratoryRate),
      mucousMembranes: raw.mucousMembranes ?? null,
      lymphNodes: raw.lymphNodes?.trim() || null,
      hydration: raw.hydration ?? null,
      crtSeconds: this.normalizeInteger(raw.crtSeconds),
      examNotes: raw.examNotes?.trim() || null,
    };
  }

  private environmentPayload(): EncounterEnvironmentalData {
    const raw = this.environmentForm.getRawValue();
    return {
      environmentNotes: raw.environmentNotes?.trim() || null,
      nutritionNotes: raw.nutritionNotes?.trim() || null,
      lifestyleNotes: raw.lifestyleNotes?.trim() || null,
      feedingTypeNotes: raw.feedingTypeNotes?.trim() || null,
      notes: raw.notes?.trim() || null,
    };
  }

  private impressionPayload(): EncounterClinicalImpression {
    const raw = this.impressionForm.getRawValue();
    return {
      presumptiveDiagnosis: raw.presumptiveDiagnosis?.trim() || null,
      differentialDiagnosis: raw.differentialDiagnosis?.trim() || null,
      prognosis: raw.prognosis?.trim() || null,
      clinicalNotes: raw.clinicalNotes?.trim() || null,
    };
  }

  private planPayload(): EncounterPlan {
    const raw = this.planForm.getRawValue();
    return {
      clinicalPlan: raw.clinicalPlan?.trim() || null,
      requiresFollowUp: raw.requiresFollowUp ?? false,
      suggestedFollowUpDate:
        raw.requiresFollowUp && raw.suggestedFollowUpDate?.trim()
          ? raw.suggestedFollowUpDate.trim()
          : undefined,
      planNotes: raw.planNotes?.trim() || null,
    };
  }

  private sectionHasChanges(block: ClinicalBlock): boolean {
    return JSON.stringify(this.currentPayloadForBlock(block)) !== JSON.stringify(this.persistedPayloadForBlock(block));
  }

  private currentPayloadForBlock(block: ClinicalBlock): unknown {
    switch (block) {
      case 'reason':
        return this.reasonPayload();
      case 'anamnesis':
        return this.anamnesisPayload();
      case 'exam':
        return this.examPayload();
      case 'environment':
        return this.environmentPayload();
      case 'impression':
        return this.impressionPayload();
      case 'plan':
        return this.planPayload();
    }
  }

  private persistedPayloadForBlock(block: ClinicalBlock): unknown {
    switch (block) {
      case 'reason':
        return {
          consultationReason: this.encounter?.consultationReason?.consultationReason?.trim() ?? '',
          currentIllnessHistory: this.trimOrNull(
            this.encounter?.consultationReason?.currentIllnessHistory,
          ),
          referredPreviousDiagnoses: this.trimOrNull(
            this.encounter?.consultationReason?.referredPreviousDiagnoses,
          ),
          referredPreviousTreatments: this.trimOrNull(
            this.encounter?.consultationReason?.referredPreviousTreatments,
          ),
        };
      case 'anamnesis':
        return {
          problemStartText: this.trimOrNull(this.encounter?.anamnesis?.problemStartText),
          previousSurgeriesText: this.trimOrNull(this.encounter?.anamnesis?.previousSurgeriesText),
          howProblemStartedText: this.trimOrNull(this.encounter?.anamnesis?.howProblemStartedText),
          vaccinesUpToDate: this.encounter?.anamnesis?.vaccinesUpToDate ?? null,
          dewormingUpToDate: this.encounter?.anamnesis?.dewormingUpToDate ?? null,
          hasPetAtHome: this.encounter?.anamnesis?.hasPetAtHome ?? null,
          petAtHomeDetail: this.trimOrNull(this.encounter?.anamnesis?.petAtHomeDetail),
          administeredMedicationText: this.trimOrNull(
            this.encounter?.anamnesis?.administeredMedicationText,
          ),
          appetiteStatus: this.encounter?.anamnesis?.appetiteStatus ?? null,
          waterIntakeStatus: this.encounter?.anamnesis?.waterIntakeStatus ?? null,
          fecesText: this.trimOrNull(this.encounter?.anamnesis?.fecesText),
          vomitText: this.trimOrNull(this.encounter?.anamnesis?.vomitText),
          numberOfBowelMovements: this.normalizeInteger(
            this.encounter?.anamnesis?.numberOfBowelMovements,
          ),
          urineText: this.trimOrNull(this.encounter?.anamnesis?.urineText),
          respiratoryProblemsText: this.trimOrNull(
            this.encounter?.anamnesis?.respiratoryProblemsText,
          ),
          difficultyWalkingText: this.trimOrNull(
            this.encounter?.anamnesis?.difficultyWalkingText,
          ),
          notes: this.trimOrNull(this.encounter?.anamnesis?.notes),
        };
      case 'exam':
        return {
          weightKg: this.normalizeNumber(this.encounter?.clinicalExam?.weightKg),
          temperatureC: this.normalizeNumber(this.encounter?.clinicalExam?.temperatureC),
          pulse: this.normalizeInteger(this.encounter?.clinicalExam?.pulse),
          heartRate: this.normalizeInteger(this.encounter?.clinicalExam?.heartRate),
          respiratoryRate: this.normalizeInteger(this.encounter?.clinicalExam?.respiratoryRate),
          mucousMembranes: this.encounter?.clinicalExam?.mucousMembranes ?? null,
          lymphNodes: this.trimOrNull(this.encounter?.clinicalExam?.lymphNodes),
          hydration: this.encounter?.clinicalExam?.hydration ?? null,
          crtSeconds: this.normalizeInteger(this.encounter?.clinicalExam?.crtSeconds),
          examNotes: this.trimOrNull(this.encounter?.clinicalExam?.examNotes),
        };
      case 'environment':
        return {
          environmentNotes: this.trimOrNull(this.encounter?.environmentalData?.environmentNotes),
          nutritionNotes: this.trimOrNull(this.encounter?.environmentalData?.nutritionNotes),
          lifestyleNotes: this.trimOrNull(this.encounter?.environmentalData?.lifestyleNotes),
          feedingTypeNotes: this.trimOrNull(this.encounter?.environmentalData?.feedingTypeNotes),
          notes: this.trimOrNull(this.encounter?.environmentalData?.notes),
        };
      case 'impression':
        return {
          presumptiveDiagnosis: this.trimOrNull(
            this.encounter?.clinicalImpression?.presumptiveDiagnosis,
          ),
          differentialDiagnosis: this.trimOrNull(
            this.encounter?.clinicalImpression?.differentialDiagnosis,
          ),
          prognosis: this.trimOrNull(this.encounter?.clinicalImpression?.prognosis),
          clinicalNotes: this.trimOrNull(this.encounter?.clinicalImpression?.clinicalNotes),
        };
      case 'plan':
        return {
          clinicalPlan: this.trimOrNull(this.encounter?.plan?.clinicalPlan),
          requiresFollowUp: this.encounter?.plan?.requiresFollowUp ?? false,
          suggestedFollowUpDate:
            this.encounter?.plan?.requiresFollowUp && this.encounter?.plan?.suggestedFollowUpDate
              ? this.encounter.plan.suggestedFollowUpDate.trim()
              : undefined,
          planNotes: this.trimOrNull(this.encounter?.plan?.planNotes),
        };
    }
  }

  private applyEncounterPreservingUnsavedChanges(
    encounter: EncounterDetail,
    savedBlock: ClinicalBlock,
  ): void {
    const draftBlocks = (Object.keys(TAB_BY_BLOCK) as ClinicalBlock[]).filter(
      (block) => block !== savedBlock && this.sectionHasChanges(block),
    );
    const drafts = draftBlocks.map((block) => ({
      block,
      value: this.formForTab(this.tabByBlock[block]).getRawValue(),
      error: this.tabState[this.tabByBlock[block]].error,
    }));

    this.applyEncounter(encounter);

    if (drafts.length === 0) {
      return;
    }

    this.suppressFormTracking.value = true;
    for (const draft of drafts) {
      const tab = this.tabByBlock[draft.block];
      const form = this.formForTab(tab);
      form.patchValue(draft.value, { emitEvent: false });
      form.markAsDirty();
      form.updateValueAndValidity({ emitEvent: false });
      this.setTabMeta(tab, {
        status: 'dirty',
        error: draft.error,
      });
    }
    this.suppressFormTracking.value = false;
  }

  private trimOrNull(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeInteger(value: unknown): number | null {
    const parsed = this.normalizeNumber(value);
    return parsed === null ? null : Math.trunc(parsed);
  }

  protected todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private nowDateTimeLocal(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }

  private toIsoString(value: string | null | undefined): string | null {
    if (!value?.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private createEmptyTreatmentItem(): TreatmentItemDraft {
    return {
      medication: '',
      dose: '',
      frequency: '',
      durationDays: 1,
      administrationRoute: '',
      notes: '',
    };
  }

  private buildDraftId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private pendingActionsStorageKey(encounterId: number): string {
    return `safe-pet:encounter:${encounterId}:pending-actions`;
  }

  private persistPendingActions(): void {
    if (!this.encounter || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(
      this.pendingActionsStorageKey(this.encounter.id),
      JSON.stringify({
        vaccinations: this.pendingVaccinations,
        treatments: this.pendingTreatments,
        procedures: this.pendingProcedures,
      }),
    );
  }

  private restorePendingActions(encounterId: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(this.pendingActionsStorageKey(encounterId));
    if (!raw) {
      this.pendingVaccinations = [];
      this.pendingTreatments = [];
      this.pendingProcedures = [];
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        vaccinations?: PendingVaccinationDraft[];
        treatments?: PendingTreatmentDraft[];
        procedures?: PendingProcedureDraft[];
      };
      this.pendingVaccinations = parsed.vaccinations ?? [];
      this.pendingTreatments = parsed.treatments ?? [];
      this.pendingProcedures = parsed.procedures ?? [];
    } catch {
      this.pendingVaccinations = [];
      this.pendingTreatments = [];
      this.pendingProcedures = [];
    }
  }

  private clearPendingActions(): void {
    if (this.encounter && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.pendingActionsStorageKey(this.encounter.id));
    }

    this.pendingVaccinations = [];
    this.pendingTreatments = [];
    this.pendingProcedures = [];
  }
}
