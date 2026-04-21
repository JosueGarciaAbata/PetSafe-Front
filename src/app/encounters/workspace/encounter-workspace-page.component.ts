import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  AbstractControl,
  FormControl,
  FormsModule,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import {
  ClinicalCaseActiveTreatment,
  ClinicalCaseOutcome,
  ClinicalCasePlanLinkMode,
  ClinicalCaseSummary,
  TreatmentEvolutionAction,
} from '@app/clinical-cases/models/clinical-case.model';
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
  EncounterAttachment,
  EncounterClinicalExam,
  EncounterClinicalImpression,
  EncounterDetail,
  EncounterEnvironmentalData,
  EncounterPlan,
  EncounterProcedure,
  EncounterProcedureDraft,
  EncounterTreatment,
  EncounterTreatmentDraft,
  EncounterTreatmentEvolutionEvent,
  EncounterTreatmentReviewDraft,
  EncounterVaccinationEvent,
  EncounterVaccinationDraft,
  HydrationStatus,
  MucosaStatus,
  ProcedureCatalogItem,
  WaterIntakeStatus,
} from '../models/encounter.model';
import {
  CLINICAL_SHORT_TEXT_MAX_LENGTH,
  CLINICAL_TEMPERATURE_MAX,
  CLINICAL_TEMPERATURE_MIN,
  CLINICAL_TEXT_MAX_LENGTH,
  ENCOUNTER_TAB_LABELS,
  ENCOUNTER_TAB_ORDER,
  TAB_BY_BLOCK,
} from './encounter-workspace.constants';
import {
  ClinicalBlock,
  ClinicalTabView,
  TabMeta,
  TabStatus,
  TabView,
  TreatmentItemDraft,
} from './encounter-workspace.types';

type PatientSummarySectionKey = 'overview' | 'vaccination' | 'notes' | 'history';
type EncounterActionPanel = 'VACCINATIONS' | 'TREATMENTS' | 'PROCEDURES';

interface PatientSummaryContext {
  title: string;
  description: string;
  sections: readonly PatientSummarySectionKey[];
}

@Component({
  selector: 'app-encounter-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    ShellIconComponent,
    ConfirmDialogComponent,
    CreateVaccineApplicationModalComponent,
  ],
  templateUrl: './encounter-workspace-page.component.html',
  styleUrl: './encounter-workspace-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterWorkspacePageComponent implements OnInit, OnDestroy {
  private readonly encountersApi = inject(EncountersApiService);
  private readonly petsApi = inject(PetsApiService);
  private readonly patientVaccinationApi = inject(PatientVaccinationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly tabByBlock = TAB_BY_BLOCK;
  private readonly suppressFormTracking = { value: false };
  private reactivationGraceTimerId: ReturnType<typeof setInterval> | null = null;
  private autoTriggerValidation = false;

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
  protected isPatientSummaryOpen = false;
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
  protected expandedActionPanel: EncounterActionPanel | null = 'VACCINATIONS';
  protected procedureCatalogSearch = '';
  protected pendingVaccinations: EncounterVaccinationDraft[] = [];
  protected pendingTreatments: EncounterTreatmentDraft[] = [];
  protected pendingProcedures: EncounterProcedureDraft[] = [];
  protected treatmentReviewDrafts: EncounterTreatmentReviewDraft[] = [];
  protected treatmentEvolutionEvents: EncounterTreatmentEvolutionEvent[] = [];
  protected editingVaccinationDraftId: number | null = null;
  protected editingTreatmentDraftId: number | null = null;
  protected editingProcedureDraftId: number | null = null;
  protected replacementSourceTreatmentId: number | null = null;
  protected attachments: EncounterAttachment[] = [];
  protected isUploadingAttachment = false;
  protected attachmentError: string | null = null;
  protected attachmentPreview: EncounterAttachment | null = null;
  protected attachmentPreviewUrl: SafeResourceUrl | null = null;
  protected pendingDeleteAttachment: EncounterAttachment | null = null;
  protected isDeletingAttachment = false;
  protected readonly clinicalTextMaxLength = CLINICAL_TEXT_MAX_LENGTH;
  protected readonly clinicalShortTextMaxLength = CLINICAL_SHORT_TEXT_MAX_LENGTH;
  protected readonly clinicalTemperatureMin = CLINICAL_TEMPERATURE_MIN;
  protected readonly clinicalTemperatureMax = CLINICAL_TEMPERATURE_MAX;
  protected readonly tabOrder = ENCOUNTER_TAB_ORDER;
  protected readonly tabLabels = ENCOUNTER_TAB_LABELS;
  private readonly patientSummaryContextByTab: Record<TabView, PatientSummaryContext> = {
    REASON: {
      title: 'Contexto inicial',
      description: 'Antecedentes y referencias generales para orientar el motivo de consulta.',
      sections: ['overview', 'notes', 'history'],
    },
    ANAMNESIS: {
      title: 'Antecedentes del paciente',
      description: 'Información longitudinal e histórico relacionado para profundizar la anamnesis.',
      sections: ['overview', 'notes', 'history'],
    },
    EXAM: {
      title: 'Referencia clínica rápida',
      description: 'Datos base y estado vacunal útiles mientras registras los datos fisiológicos.',
      sections: ['overview', 'vaccination'],
    },
    IMPRESSION: {
      title: 'Apoyo diagnóstico',
      description: 'Resumen de datos base, vacunas y antecedentes para sostener el diagnóstico clínico.',
      sections: ['overview', 'vaccination', 'notes', 'history'],
    },
    ACTIONS: {
      title: 'Seguimiento operativo',
      description: 'Vista concentrada en vacunas e histórico útil para ejecutar acciones clínicas.',
      sections: ['vaccination', 'history'],
    },
    PLAN: {
      title: 'Contexto para el plan',
      description: 'Datos de referencia y notas longitudinales para definir seguimiento y próximos pasos.',
      sections: ['overview', 'vaccination', 'notes'],
    },
  };
  protected readonly tabState: Record<TabView, TabMeta> = {
    REASON: { status: 'clean', error: null },
    ANAMNESIS: { status: 'clean', error: null },
    EXAM: { status: 'clean', error: null },
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
    'AUMENTADO',
    'DISMINUIDO',
  ];
  protected readonly mucosaOptions: readonly MucosaStatus[] = [
    'NORMAL',
    'PALIDA',
    'ICTERICA',
    'CIANOTICA',
    'HIPEREMICA',
  ];
  protected readonly hydrationOptions: readonly HydrationStatus[] = [
    'NORMAL',
    'LEVE_DESHIDRATACION',
    'MODERADA_DESHIDRATACION',
    'SEVERA_DESHIDRATACION',
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
    temperatureC: new FormControl<number | null>(null, {
      validators: [Validators.min(CLINICAL_TEMPERATURE_MIN), Validators.max(CLINICAL_TEMPERATURE_MAX)],
    }),
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
    caseLinkMode: new FormControl<ClinicalCasePlanLinkMode>('NONE', {
      nonNullable: true,
    }),
    clinicalCaseId: new FormControl<number | null>(null),
    problemSummary: new FormControl('', {
      validators: [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
    }),
    caseOutcome: new FormControl<ClinicalCaseOutcome | null>(null),
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

    if (history.state?.autoFinishActionError) {
      this.actionError = history.state.autoFinishActionError;
      this.autoTriggerValidation = true;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.loadError = 'ID de consulta no proporcionado.';
      this.isLoading = false;
      return;
    }

    void this.loadEncounter(id);
  }

  ngOnDestroy(): void {
    this.clearReactivationGraceTimer();
  }

  protected setTab(tab: TabView): void {
    this.activeTab = tab;
  }

  protected togglePatientSummary(): void {
    this.isPatientSummaryOpen = !this.isPatientSummaryOpen;
  }

  protected isEncounterEditable(): boolean {
    return this.isEncounterStatusEditable(this.encounter?.status);
  }

  protected isTabEditable(_tab: TabView): boolean {
    return this.isEncounterEditable();
  }

  protected canReactivateEncounter(): boolean {
    return this.hasReactivationGraceRemaining(this.encounter);
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
    if (!this.encounter || this.isSavingAll || this.isSubmittingAction || !this.isEncounterEditable()) {
      return;
    }

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
        const mustValidateBlock = fromFinishFlow && step.block === 'reason';

        if (!this.sectionHasChanges(step.block)) {
          if (mustValidateBlock) {
            const validationMessage = this.validateClinicalStep(step.block);
            if (validationMessage) {
              this.setTabMeta(step.tab, {
                status: 'dirty',
                error: validationMessage,
              });
              firstErrorTab ??= step.tab;
              continue;
            }
          }

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
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'VACCINATIONS';
    this.editingVaccinationDraftId = null;
    this.vaccinationError = null;
    this.isVaccinationModalOpen = true;
  }

  protected editPendingVaccination(draft: EncounterVaccinationDraft): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'VACCINATIONS';
    this.editingVaccinationDraftId = draft.id;
    this.vaccinationError = null;
    this.isVaccinationModalOpen = true;
  }

  protected closeVaccinationModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.editingVaccinationDraftId = null;
    this.isVaccinationModalOpen = false;
  }

  protected async submitVaccinationDraft(
    payload: CreatePatientVaccineApplicationRequest,
  ): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

    const selectedVaccine = this.availableVaccines.find((item) => item.id === payload.vaccineId);
    if (!selectedVaccine || !payload.applicationDate?.trim()) {
      this.vaccinationError = 'Selecciona una vacuna y una fecha de aplicación válida.';
      this.cdr.detectChanges();
      return;
    }

    const editingDraft = this.pendingVaccinations.find(
      (item) => item.id === this.editingVaccinationDraftId,
    );
    const request: CreateEncounterVaccinationRequest = {
      planDoseId: editingDraft?.planDoseId ?? undefined,
      vaccineId: payload.vaccineId,
      applicationDate: payload.applicationDate.trim(),
      suggestedNextDate: payload.nextDoseDate?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
    };

    this.isSubmittingAction = true;
    this.vaccinationError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.editingVaccinationDraftId
          ? this.encountersApi.updateVaccinationDraft(
              this.encounter.id,
              this.editingVaccinationDraftId,
              request,
            )
          : this.encountersApi.createVaccinationDraft(this.encounter.id, request),
      );
      this.applyEncounter(updated);
      this.isVaccinationModalOpen = false;
    } catch (error) {
      this.vaccinationError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar la vacunación pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected openTreatmentModal(): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'TREATMENTS';
    this.editingTreatmentDraftId = null;
    this.replacementSourceTreatmentId = null;
    this.treatmentError = null;
    this.treatmentForm.reset({
      startDate: this.todayDate(),
      endDate: '',
      generalInstructions: '',
    });
    this.treatmentItems = [this.createEmptyTreatmentItem()];
    this.isTreatmentModalOpen = true;
  }

  protected editPendingTreatment(draft: EncounterTreatmentDraft): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'TREATMENTS';
    this.editingTreatmentDraftId = draft.id;
    this.replacementSourceTreatmentId = draft.replacesTreatmentId ?? null;
    this.treatmentError = null;
    this.treatmentForm.reset({
      startDate: draft.startDate,
      endDate: draft.endDate ?? '',
      generalInstructions: draft.generalInstructions ?? '',
    });
    this.treatmentItems =
      draft.items.length > 0
        ? draft.items.map((item) => ({
            medication: item.medication,
            dose: item.dose,
            frequency: item.frequency,
            durationDays: item.durationDays,
            administrationRoute: item.administrationRoute,
            notes: item.notes ?? '',
          }))
        : [this.createEmptyTreatmentItem()];
    this.isTreatmentModalOpen = true;
  }

  protected closeTreatmentModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.editingTreatmentDraftId = null;
    this.replacementSourceTreatmentId = null;
    this.isTreatmentModalOpen = false;
  }

  protected openReplacementTreatmentModal(sourceTreatmentId: number): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'TREATMENTS';
    this.editingTreatmentDraftId = null;
    this.replacementSourceTreatmentId = sourceTreatmentId;
    this.treatmentError = null;
    this.treatmentForm.reset({
      startDate: this.todayDate(),
      endDate: '',
      generalInstructions: '',
    });
    this.treatmentItems = [this.createEmptyTreatmentItem()];
    this.isTreatmentModalOpen = true;
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

  protected async submitTreatment(): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

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
      replacesTreatmentId: this.replacementSourceTreatmentId ?? undefined,
      items: items.map((item) => ({
        medication: item.medication,
        dose: item.dose,
        frequency: item.frequency,
        durationDays: item.durationDays as number,
        administrationRoute: item.administrationRoute,
        notes: item.notes,
      })),
    };

    this.isSubmittingAction = true;
    this.treatmentError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.editingTreatmentDraftId
          ? this.encountersApi.updateTreatmentDraft(
              this.encounter.id,
              this.editingTreatmentDraftId,
              payload,
            )
          : this.encountersApi.createTreatmentDraft(this.encounter.id, payload),
      );
      this.applyEncounter(updated);
      this.isTreatmentModalOpen = false;
    } catch (error) {
      this.treatmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar el tratamiento pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected async setTreatmentReviewAction(
    sourceTreatmentId: number,
    action: Exclude<TreatmentEvolutionAction, 'REEMPLAZA'>,
  ): Promise<void> {
    if (!this.encounter || this.isSubmittingAction || !this.isEncounterEditable()) {
      return;
    }

    this.isSubmittingAction = true;
    this.treatmentError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.encountersApi.upsertTreatmentReviewDraft(this.encounter.id, {
          sourceTreatmentId,
          action,
        }),
      );
      this.applyEncounter(updated);
    } catch (error) {
      this.treatmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo registrar la evolución terapéutica pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected async removeTreatmentReviewDraft(draftId: number): Promise<void> {
    if (!this.encounter || this.isSubmittingAction || !this.isEncounterEditable()) {
      return;
    }

    this.isSubmittingAction = true;
    this.treatmentError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.encountersApi.deleteTreatmentReviewDraft(this.encounter.id, draftId),
      );
      this.applyEncounter(updated);
    } catch (error) {
      this.treatmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo quitar la revisión terapéutica pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected openProcedureModal(): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'PROCEDURES';
    this.editingProcedureDraftId = null;
    this.procedureError = null;
    this.procedureForm.reset({
      catalogId: null,
      procedureType: '',
      performedDate: this.nowDateTimeLocal(),
      description: '',
      result: '',
      notes: '',
    });
    this.procedureCatalogSearch = '';
    this.isProcedureModalOpen = true;
  }

  protected editPendingProcedure(draft: EncounterProcedureDraft): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.expandedActionPanel = 'PROCEDURES';
    this.editingProcedureDraftId = draft.id;
    this.procedureError = null;
    this.procedureForm.reset({
      catalogId: draft.catalogId,
      procedureType: draft.procedureType ?? '',
      performedDate: this.toDateTimeLocalValue(draft.performedDate),
      description: draft.description ?? '',
      result: draft.result ?? '',
      notes: draft.notes ?? '',
    });
    this.syncProcedureCatalogSelection(
      draft.catalogId
        ? (this.procedureCatalog.find((item) => item.id === draft.catalogId) ?? null)
        : null,
    );
    this.isProcedureModalOpen = true;
  }

  protected closeProcedureModal(): void {
    if (this.isSubmittingAction) {
      return;
    }

    this.editingProcedureDraftId = null;
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

  protected toggleActionPanel(panel: EncounterActionPanel): void {
    this.expandedActionPanel = this.expandedActionPanel === panel ? null : panel;
  }

  protected isActionPanelOpen(panel: EncounterActionPanel): boolean {
    return this.expandedActionPanel === panel;
  }

  protected onProcedureCatalogSearchChanged(value: string): void {
    this.procedureCatalogSearch = value;

    const normalizedValue = value.trim().toLowerCase();
    const matchedCatalogItem =
      this.procedureCatalog.find((item) =>
        this.buildProcedureCatalogLabel(item).trim().toLowerCase() === normalizedValue,
      ) ?? null;

    this.syncProcedureCatalogSelection(matchedCatalogItem, {
      preserveSearchText: true,
    });
  }

  protected onProcedureCatalogOptionSelection(
    isUserInput: boolean,
    item: ProcedureCatalogItem,
  ): void {
    if (!isUserInput) {
      return;
    }

    this.syncProcedureCatalogSelection(item);
  }

  protected procedureCatalogOptions(): ProcedureCatalogItem[] {
    const normalizedSearch = this.procedureCatalogSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return this.procedureCatalog;
    }

    return this.procedureCatalog.filter((item) =>
      [
        item.name,
        item.description ?? '',
      ].join(' ').toLowerCase().includes(normalizedSearch),
    );
  }

  protected buildProcedureCatalogLabel(item: ProcedureCatalogItem): string {
    return item.name.trim();
  }

  protected buildProcedureCatalogMeta(item: ProcedureCatalogItem): string {
    return item.description?.trim() || 'Sin descripción adicional en catálogo.';
  }

  protected async submitProcedure(): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

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

    this.isSubmittingAction = true;
    this.procedureError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.editingProcedureDraftId
          ? this.encountersApi.updateProcedureDraft(
              this.encounter.id,
              this.editingProcedureDraftId,
              payload,
            )
          : this.encountersApi.createProcedureDraft(this.encounter.id, payload),
      );
      this.applyEncounter(updated);
      this.isProcedureModalOpen = false;
    } catch (error) {
      this.procedureError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar el procedimiento pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected finishEncounter(): void {
    if (!this.encounter || !this.isEncounterEditable()) {
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
    if (!this.encounter || !this.isEncounterEditable()) {
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

      const updated = await firstValueFrom(this.encountersApi.finish(this.encounter.id));
      this.applyEncounter(updated);
      await this.loadPatientContext(updated.patientId);
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

  protected async reactivateEncounter(): Promise<void> {
    if (!this.encounter || !this.canReactivateEncounter() || this.isSubmittingAction || this.isSavingAll) {
      return;
    }

    this.isSubmittingAction = true;
    this.actionError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(this.encountersApi.reactivate(this.encounter.id));
      this.applyEncounter(updated);
      await this.loadPatientContext(updated.patientId);
    } catch (error) {
      this.actionError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo reactivar la atención médica.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
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

  protected patientSummaryToggleLabel(): string {
    return this.isPatientSummaryOpen ? 'Ocultar resumen del paciente' : 'Mostrar resumen del paciente';
  }

  protected patientSummaryTitle(): string {
    return this.patientSummaryContextByTab[this.activeTab].title;
  }

  protected patientSummaryDescription(): string {
    return this.patientSummaryContextByTab[this.activeTab].description;
  }

  protected shouldShowPatientSummarySection(section: PatientSummarySectionKey): boolean {
    return this.patientSummaryContextByTab[this.activeTab].sections.includes(section);
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
      if (tab === 'PLAN' && controlName === 'clinicalCaseId') {
        return 'Debes seleccionar el caso clínico existente para continuar el seguimiento.';
      }
      if (tab === 'PLAN' && controlName === 'problemSummary') {
        return 'Debes resumir el problema clínico para abrir un caso nuevo.';
      }
    }

    if (control.errors['min']) {
      if (tab === 'EXAM' && controlName === 'weightKg') {
        return 'El peso debe ser mayor a 0.';
      }
      if (tab === 'EXAM' && controlName === 'temperatureC') {
        return `La temperatura debe estar entre ${this.clinicalTemperatureMin} y ${this.clinicalTemperatureMax} °C.`;
      }
      return 'El valor debe ser mayor o igual a 0.';
    }

    if (control.errors['max']) {
      if (tab === 'EXAM' && controlName === 'temperatureC') {
        return `La temperatura debe estar entre ${this.clinicalTemperatureMin} y ${this.clinicalTemperatureMax} °C.`;
      }
      return 'El valor supera el máximo permitido.';
    }

    if (control.errors['maxlength']) {
      return `No puede superar los ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (control.errors['invalidTodayOrFutureDate']) {
      return 'La fecha sugerida debe ser hoy o futura.';
    }

    if (control.errors['caseLinkModeRequired']) {
      return 'Debes decidir si el seguimiento abrirá un caso nuevo o se vinculará a uno existente.';
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
      case 'REACTIVADA':
        return 'Reactivada';
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

  protected currentVaccinationDraft(): EncounterVaccinationDraft | null {
    return this.editingVaccinationDraftId !== null
      ? (this.pendingVaccinations.find((item) => item.id === this.editingVaccinationDraftId) ?? null)
      : null;
  }

  protected currentVaccinationDraftProduct(): VaccineCatalogItem | null {
    const currentDraft = this.currentVaccinationDraft();
    return currentDraft
      ? (this.availableVaccines.find((item) => item.id === currentDraft.vaccineId) ?? null)
      : null;
  }

  protected currentTreatmentDraft(): EncounterTreatmentDraft | null {
    return this.editingTreatmentDraftId !== null
      ? (this.pendingTreatments.find((item) => item.id === this.editingTreatmentDraftId) ?? null)
      : null;
  }

  protected currentProcedureDraft(): EncounterProcedureDraft | null {
    return this.editingProcedureDraftId !== null
      ? (this.pendingProcedures.find((item) => item.id === this.editingProcedureDraftId) ?? null)
      : null;
  }

  protected hasEncounterClinicalCase(): boolean {
    return Boolean(this.encounter?.clinicalCaseSummary);
  }

  protected clinicalCaseSummary(): ClinicalCaseSummary | null {
    return this.encounter?.clinicalCaseSummary ?? null;
  }

  protected availableClinicalCases(): ClinicalCaseSummary[] {
    return [...(this.patientDetail?.clinicalCases ?? [])].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'ABIERTO' ? -1 : 1;
      }

      return right.openedAt.localeCompare(left.openedAt);
    });
  }

  protected availableOpenClinicalCases(): ClinicalCaseSummary[] {
    return this.availableClinicalCases().filter((item) => item.status === 'ABIERTO');
  }

  protected selectedPlanClinicalCase(): ClinicalCaseSummary | null {
    const selectedId = this.planForm.controls.clinicalCaseId.value;
    if (!selectedId) {
      return null;
    }

    return this.availableClinicalCases().find((item) => item.id === selectedId) ?? null;
  }

  protected planCasePreview(): ClinicalCaseSummary | null {
    return this.clinicalCaseSummary() ?? this.selectedPlanClinicalCase();
  }

  protected isCaseLinkSelectionLocked(): boolean {
    return this.hasEncounterClinicalCase();
  }

  protected shouldShowCaseLinkControls(): boolean {
    return this.planForm.controls.requiresFollowUp.value === true && !this.isCaseLinkSelectionLocked();
  }

  protected shouldShowExistingCaseSelector(): boolean {
    return (
      this.shouldShowCaseLinkControls()
      && this.planForm.controls.caseLinkMode.value === 'EXISTING'
    );
  }

  protected shouldShowNewCaseSummaryField(): boolean {
    return (
      this.shouldShowCaseLinkControls()
      && this.planForm.controls.caseLinkMode.value === 'NEW'
    );
  }

  protected shouldShowCaseOutcomeSelector(): boolean {
    return this.hasEncounterClinicalCase();
  }

  protected currentCaseOutcome(): ClinicalCaseOutcome {
    return this.planForm.controls.caseOutcome.value ?? 'CONTINUA';
  }

  protected willGenerateFollowUpAppointment(): boolean {
    return (
      this.planForm.controls.requiresFollowUp.value === true
      && this.currentCaseOutcome() === 'CONTINUA'
    );
  }

  protected leavesCaseOpenWithoutFollowUp(): boolean {
    return (
      this.hasEncounterClinicalCase()
      && this.planForm.controls.requiresFollowUp.value !== true
      && this.currentCaseOutcome() === 'CONTINUA'
    );
  }

  protected selectCaseLinkMode(mode: ClinicalCasePlanLinkMode): void {
    if (!this.isEncounterEditable() || this.isCaseLinkSelectionLocked()) {
      return;
    }

    this.planForm.controls.caseLinkMode.setValue(mode);
    if (mode === 'EXISTING') {
      this.planForm.controls.problemSummary.setValue('');
      if (!this.planForm.controls.clinicalCaseId.value) {
        const firstOpenCase = this.availableOpenClinicalCases()[0];
        this.planForm.controls.clinicalCaseId.setValue(firstOpenCase?.id ?? null);
      }
    } else if (mode === 'NEW') {
      this.planForm.controls.clinicalCaseId.setValue(null);
    } else {
      this.planForm.controls.clinicalCaseId.setValue(null);
      this.planForm.controls.problemSummary.setValue('');
    }
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

  protected buildClinicalCaseOutcomeLabel(outcome: ClinicalCaseOutcome | null | undefined): string {
    switch (outcome) {
      case 'RESUELTO':
        return 'Marcar como resuelto';
      case 'CANCELADO':
        return 'Cancelar caso';
      default:
        return 'Mantener en seguimiento';
    }
  }

  protected buildFollowUpStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'PROGRAMADO':
        return 'Programado';
      case 'EN_ATENCION':
        return 'En atención';
      case 'COMPLETADO':
        return 'Completado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return 'Sin estado';
    }
  }

  protected activeCaseTreatments(): ClinicalCaseActiveTreatment[] {
    return this.clinicalCaseSummary()?.activeTreatments ?? [];
  }

  protected treatmentReviewDraftForSourceTreatment(
    treatmentId: number,
  ): EncounterTreatmentReviewDraft | null {
    return this.treatmentReviewDrafts.find((draft) => draft.sourceTreatmentId === treatmentId) ?? null;
  }

  protected replacementDraftForSourceTreatment(
    treatmentId: number,
  ): EncounterTreatmentDraft | null {
    return this.pendingTreatments.find((draft) => draft.replacesTreatmentId === treatmentId) ?? null;
  }

  protected hasPendingCaseTreatmentDecision(treatmentId: number): boolean {
    return Boolean(
      this.treatmentReviewDraftForSourceTreatment(treatmentId)
      || this.replacementDraftForSourceTreatment(treatmentId),
    );
  }

  protected replacementSourceTreatment(): ClinicalCaseActiveTreatment | null {
    if (!this.replacementSourceTreatmentId) {
      return null;
    }

    return this.activeCaseTreatments().find((item) => item.id === this.replacementSourceTreatmentId) ?? null;
  }

  protected replacementSourceTreatmentSummary(): string | null {
    return this.replacementSourceTreatment()?.summary ?? null;
  }

  protected buildTreatmentReviewActionLabel(
    action: Exclude<TreatmentEvolutionAction, 'REEMPLAZA'>,
  ): string {
    switch (action) {
      case 'CONTINUA':
        return 'Continúa';
      case 'SUSPENDE':
        return 'Suspender';
      case 'FINALIZA':
        return 'Finalizar';
      default:
        return action;
    }
  }

  protected buildTreatmentReviewActionClasses(
    action: Exclude<TreatmentEvolutionAction, 'REEMPLAZA'>,
  ): string {
    switch (action) {
      case 'CONTINUA':
        return 'ps-tone ps-tone--info ps-tone-surface';
      case 'SUSPENDE':
        return 'ps-tone ps-tone--warning ps-tone-surface';
      case 'FINALIZA':
        return 'ps-tone ps-tone--danger ps-tone-surface';
      default:
        return 'rounded-full border border-border bg-background text-text-secondary';
    }
  }

  protected buildTreatmentEvolutionEventLabel(event: EncounterTreatmentEvolutionEvent): string {
    switch (event.eventType) {
      case 'CONTINUA':
        return 'Continuado';
      case 'SUSPENDE':
        return 'Suspendido';
      case 'FINALIZA':
        return 'Finalizado';
      case 'REEMPLAZA':
        return 'Reemplazado';
      default:
        return event.eventType;
    }
  }

  protected buildTreatmentEvolutionEventClasses(eventType: TreatmentEvolutionAction): string {
    switch (eventType) {
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
      case 'AUMENTADO':
        return 'Aumentado';
      case 'DISMINUIDO':
        return 'Disminuido';
      default:
        return 'Normal';
    }
  }

  protected buildMucosaLabel(value: MucosaStatus | null | undefined): string {
    switch (value) {
      case 'PALIDA':
        return 'Pálidas';
      case 'ICTERICA':
        return 'Ictéricas';
      case 'CIANOTICA':
        return 'Cianóticas';
      case 'HIPEREMICA':
        return 'Hiperémicas';
      default:
        return 'Normales';
    }
  }

  protected buildHydrationLabel(value: HydrationStatus | null | undefined): string {
    switch (value) {
      case 'LEVE_DESHIDRATACION':
        return 'Deshidratación leve';
      case 'MODERADA_DESHIDRATACION':
        return 'Deshidratación moderada';
      case 'SEVERA_DESHIDRATACION':
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

  protected treatmentDraftSummary(draft: EncounterTreatmentDraft): string {
    const medications = draft.items
      .map((item) => item.medication.trim())
      .filter((value) => value.length > 0);

    return medications.length > 0 ? medications.join(', ') : 'Tratamiento pendiente';
  }

  protected treatmentDraftReplacementLabel(draft: EncounterTreatmentDraft): string | null {
    if (!draft.replacesTreatmentId) {
      return null;
    }

    const sourceTreatment = this.activeCaseTreatments().find(
      (item) => item.id === draft.replacesTreatmentId,
    );

    return sourceTreatment?.summary ?? `Tratamiento #${draft.replacesTreatmentId}`;
  }

  protected treatmentReplacementLabel(treatment: EncounterTreatment): string | null {
    if (!treatment.replacesTreatmentId) {
      return null;
    }

    const sourceTreatment = this.activeCaseTreatments().find(
      (item) => item.id === treatment.replacesTreatmentId,
    );

    return sourceTreatment?.summary ?? `Tratamiento #${treatment.replacesTreatmentId}`;
  }

  protected treatmentEvolutionDescription(event: EncounterTreatmentEvolutionEvent): string {
    if (event.eventType === 'REEMPLAZA' && event.replacementTreatmentSummary) {
      return `Nuevo tratamiento: ${event.replacementTreatmentSummary}`;
    }

    return event.notes?.trim() || 'Evolución terapéutica registrada en esta atención.';
  }

  protected patientSurgeryHistory() {
    return this.patientDetail?.surgeries ?? [];
  }

  protected hasPatientSurgeryHistory(): boolean {
    return this.patientSurgeryHistory().length > 0;
  }

  protected patientSurgeryStatusLabel(status: string | null | undefined): string {
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
        return 'Sin estado';
    }
  }

  protected patientSurgerySourceLabel(item: {
    encounterId: number | null;
    isExternal: boolean;
  }): string {
    return item.isExternal || item.encounterId === null ? 'Externa' : 'Desde atención';
  }

  protected patientSurgeryDateLabel(item: {
    performedDate: string | null;
    scheduledDate: string | null;
  }): string {
    if (item.performedDate) {
      return `Realizada ${this.formatDate(item.performedDate)}`;
    }

    if (item.scheduledDate) {
      return `Programada ${this.formatDate(item.scheduledDate)}`;
    }

    return 'Sin fecha registrada';
  }

  protected legacyPreviousSurgeriesText(): string | null {
    const value = this.encounter?.anamnesis?.previousSurgeriesText?.trim();
    return value ? value : null;
  }

  protected vaccinationEventLabel(event: EncounterVaccinationEvent): string {
    return event.vaccineName?.trim() || 'Vacunacion registrada';
  }

  protected treatmentSummary(treatment: EncounterTreatment): string {
    const medications = treatment.items
      .map((item) => item.medication.trim())
      .filter((value) => value.length > 0);

    return medications.length > 0 ? medications.join(', ') : 'Tratamiento registrado';
  }

  protected procedureDraftLabel(draft: EncounterProcedureDraft): string {
    return draft.procedureType?.trim() || 'Procedimiento pendiente';
  }

  protected procedureLabel(procedure: EncounterProcedure): string {
    return procedure.procedureType?.trim() || 'Procedimiento registrado';
  }

  protected pendingActionsCount(): number {
    return (
      this.pendingVaccinations.length
      + this.pendingTreatments.length
      + this.pendingProcedures.length
      + this.treatmentReviewDrafts.length
    );
  }

  protected async removePendingVaccination(id: number): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

    this.isSubmittingAction = true;
    this.vaccinationError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(
        this.encountersApi.deleteVaccinationDraft(this.encounter.id, id),
      );
      this.applyEncounter(updated);
    } catch (error) {
      this.vaccinationError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo quitar la vacunación pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected async removePendingTreatment(id: number): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

    this.isSubmittingAction = true;
    this.treatmentError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(this.encountersApi.deleteTreatmentDraft(this.encounter.id, id));
      this.applyEncounter(updated);
    } catch (error) {
      this.treatmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo quitar el tratamiento pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  protected async removePendingProcedure(id: number): Promise<void> {
    if (!this.encounter || this.isSubmittingAction) {
      return;
    }

    this.isSubmittingAction = true;
    this.procedureError = null;
    this.cdr.detectChanges();

    try {
      const updated = await firstValueFrom(this.encountersApi.deleteProcedureDraft(this.encounter.id, id));
      this.applyEncounter(updated);
    } catch (error) {
      this.procedureError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo quitar el procedimiento pendiente.',
      });
    } finally {
      this.isSubmittingAction = false;
      this.cdr.detectChanges();
    }
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  private async loadAttachments(encounterId: number): Promise<void> {
    try {
      this.attachments = await firstValueFrom(this.encountersApi.listAttachments(encounterId));
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.encounter) return;

    const preparedFile = await this.prepareAttachmentFile(file);

    if (preparedFile.size > 10 * 1024 * 1024) {
      this.attachmentError = 'El archivo excede el tamaño máximo permitido de 10MB.';
      input.value = '';
      return;
    }

    this.isUploadingAttachment = true;
    this.attachmentError = null;
    this.cdr.detectChanges();

    try {
      const attachment = await firstValueFrom(
        this.encountersApi.uploadAttachment(this.encounter.id, preparedFile),
      );
      this.attachments = [...this.attachments, attachment];
    } catch (error: any) {
      this.attachmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo subir el archivo.',
      });
    } finally {
      this.isUploadingAttachment = false;
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  protected openAttachmentPreview(attachment: EncounterAttachment): void {
    this.attachmentPreview = attachment;
    this.attachmentPreviewUrl = this.isPdfAttachment(attachment)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(attachment.url)
      : null;
  }

  protected closeAttachmentPreview(): void {
    this.attachmentPreview = null;
    this.attachmentPreviewUrl = null;
  }

  protected promptDeleteAttachment(attachment: EncounterAttachment): void {
    if (!this.isEncounterEditable()) {
      return;
    }

    this.pendingDeleteAttachment = attachment;
  }

  protected closeDeleteAttachmentDialog(): void {
    if (this.isDeletingAttachment) {
      return;
    }

    this.pendingDeleteAttachment = null;
  }

  protected async confirmDeleteAttachment(): Promise<void> {
    if (!this.encounter || !this.pendingDeleteAttachment) {
      return;
    }

    this.isDeletingAttachment = true;
    this.attachmentError = null;
    this.cdr.detectChanges();

    try {
      await firstValueFrom(
        this.encountersApi.deleteAttachment(this.encounter.id, this.pendingDeleteAttachment.id),
      );
      this.attachments = this.attachments.filter((a) => a.id !== this.pendingDeleteAttachment?.id);

      if (this.attachmentPreview?.id === this.pendingDeleteAttachment.id) {
        this.closeAttachmentPreview();
      }

      this.pendingDeleteAttachment = null;
    } catch (error: any) {
      this.attachmentError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo eliminar el archivo.',
      });
    } finally {
      this.isDeletingAttachment = false;
      this.cdr.detectChanges();
    }
  }

  protected isPdfAttachment(attachment: EncounterAttachment): boolean {
    return attachment.mimeType?.includes('pdf') ?? false;
  }

  protected isImageAttachment(attachment: EncounterAttachment): boolean {
    return attachment.mimeType?.includes('image') ?? attachment.mediaType === 'IMAGEN';
  }

  protected formatAttachmentSize(sizeBytes: number | null): string {
    if (!sizeBytes || sizeBytes <= 0) {
      return 'Tamano desconocido';
    }

    const mb = sizeBytes / 1024 / 1024;
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    const kb = sizeBytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }

  protected attachmentDisplayName(attachment: EncounterAttachment): string {
    return this.normalizeAttachmentNameForDisplay(attachment.originalName);
  }

  protected getFileIcon(mimeType: string | null): string {
    if (mimeType?.includes('pdf')) return 'description';
    if (mimeType?.includes('image')) return 'image';
    return 'insert_drive_file';
  }

  private async prepareAttachmentFile(file: File): Promise<File> {
    this.attachmentError = null;

    if (!file.type.startsWith('image/')) {
      return file;
    }

    if (file.size <= 900 * 1024) {
      return file;
    }

    try {
      return await this.compressImageForUpload(file);
    } catch (error) {
      console.warn('No se pudo comprimir la imagen antes de subirla.', error);
      return file;
    }
  }

  private async compressImageForUpload(file: File): Promise<File> {
    const image = await this.readImageFile(file);
    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const bestBlob = await this.canvasToBlob(canvas, 'image/webp', 0.7);

    if (!bestBlob || bestBlob.size >= file.size * 0.98) {
      return file;
    }

    const compressedName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([bestBlob], compressedName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  }

  private async readImageFile(file: File): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };
      image.src = objectUrl;
    });
  }

  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
  ): Promise<Blob | null> {
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  private normalizeAttachmentNameForDisplay(value: string): string {
    if (!/[ÃÂ]/.test(value)) {
      return value;
    }

    try {
      const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      return decoded.includes('�') ? value : decoded;
    } catch {
      return value;
    }
  }

  private configurePlanValidation(): void {
    const followUpControl = this.planForm.controls.suggestedFollowUpDate;
    const caseLinkModeControl = this.planForm.controls.caseLinkMode;
    const clinicalCaseControl = this.planForm.controls.clinicalCaseId;
    const problemSummaryControl = this.planForm.controls.problemSummary;
    const caseOutcomeControl = this.planForm.controls.caseOutcome;

    const applyValidators = (): void => {
      const hasLinkedCase = this.hasEncounterClinicalCase();
      const requiresFollowUp = this.planForm.controls.requiresFollowUp.value === true;
      const linkMode = caseLinkModeControl.value;
      const caseOutcome = caseOutcomeControl.value ?? 'CONTINUA';
      const mustGenerateFollowUp = requiresFollowUp && caseOutcome === 'CONTINUA';

      followUpControl.setValidators(
        mustGenerateFollowUp ? [Validators.required, this.todayOrFutureDateValidator()] : [],
      );
      caseLinkModeControl.setValidators(
        mustGenerateFollowUp && !hasLinkedCase ? [this.caseLinkModeRequiredValidator()] : [],
      );
      clinicalCaseControl.setValidators(
        mustGenerateFollowUp && !hasLinkedCase && linkMode === 'EXISTING'
          ? [Validators.required]
          : [],
      );
      problemSummaryControl.setValidators(
        mustGenerateFollowUp && !hasLinkedCase && linkMode === 'NEW'
          ? [Validators.required, Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)]
          : [Validators.maxLength(CLINICAL_TEXT_MAX_LENGTH)],
      );

      if (caseOutcome !== 'CONTINUA') {
        this.planForm.controls.requiresFollowUp.setValue(false, { emitEvent: false });
        followUpControl.setValue('', { emitEvent: false });
      }

      followUpControl.updateValueAndValidity({ emitEvent: false });
      caseLinkModeControl.updateValueAndValidity({ emitEvent: false });
      clinicalCaseControl.updateValueAndValidity({ emitEvent: false });
      problemSummaryControl.updateValueAndValidity({ emitEvent: false });
    };

    applyValidators();
    this.planForm.controls.requiresFollowUp.valueChanges.subscribe(() => {
      applyValidators();
    });
    this.planForm.controls.caseLinkMode.valueChanges.subscribe((mode) => {
      if (mode === 'EXISTING') {
        this.planForm.controls.problemSummary.setValue('', { emitEvent: false });
      } else if (mode === 'NEW') {
        this.planForm.controls.clinicalCaseId.setValue(null, { emitEvent: false });
      } else {
        this.planForm.controls.clinicalCaseId.setValue(null, { emitEvent: false });
        this.planForm.controls.problemSummary.setValue('', { emitEvent: false });
      }

      applyValidators();
    });
    this.planForm.controls.caseOutcome.valueChanges.subscribe(() => {
      applyValidators();
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
        { tab: 'ANAMNESIS', form: this.environmentForm },
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
        tab: 'ANAMNESIS',
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
          ?? this.controlErrorMessage(tab, 'temperatureC')
          ?? this.controlErrorMessage(tab, 'pulse')
          ?? this.controlErrorMessage(tab, 'heartRate')
          ?? this.controlErrorMessage(tab, 'respiratoryRate')
          ?? this.controlErrorMessage(tab, 'crtSeconds')
          ?? 'Revisa los valores del examen clínico antes de guardar.'
        );
      case 'PLAN':
        return (
          this.controlErrorMessage(tab, 'suggestedFollowUpDate')
          ?? this.controlErrorMessage(tab, 'caseLinkMode')
          ?? this.controlErrorMessage(tab, 'clinicalCaseId')
          ?? this.controlErrorMessage(tab, 'problemSummary')
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

  private caseLinkModeRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = typeof control.value === 'string' ? control.value.trim().toUpperCase() : '';
      return value && value !== 'NONE' ? null : { caseLinkModeRequired: true };
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

      await Promise.all([
        this.loadPatientContext(encounter.patientId),
        this.loadReferenceData(),
        this.loadAttachments(id),
      ]);
    } catch (error) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar la consulta médica.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();

      if (this.autoTriggerValidation) {
        this.autoTriggerValidation = false;
        setTimeout(() => {
          if (this.encounter && this.isEncounterEditable()) {
            this.saveAllProgress(true).catch(() => {});
          }
        }, 100);
      }
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
      this.isPatientSummaryOpen = true;
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
    this.pendingVaccinations = encounter.vaccinationDrafts ?? [];
    this.pendingTreatments = encounter.treatmentDrafts ?? [];
    this.pendingProcedures = encounter.procedureDrafts ?? [];
    this.treatmentReviewDrafts = encounter.treatmentReviewDrafts ?? [];
    this.treatmentEvolutionEvents = encounter.treatmentEvolutionEvents ?? [];
    this.editingVaccinationDraftId = null;
    this.editingTreatmentDraftId = null;
    this.editingProcedureDraftId = null;
    this.replacementSourceTreatmentId = null;
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
      caseLinkMode:
        encounter.plan?.caseLinkMode
        ?? (encounter.clinicalCaseSummary ? 'EXISTING' : 'NONE'),
      clinicalCaseId: encounter.plan?.clinicalCaseId ?? encounter.clinicalCaseSummary?.id ?? null,
      problemSummary: encounter.plan?.problemSummary ?? '',
      caseOutcome: encounter.plan?.caseOutcome ?? (encounter.clinicalCaseSummary ? 'CONTINUA' : null),
      planNotes: encounter.plan?.planNotes ?? '',
    });

    this.reasonForm.markAsPristine();
    this.anamnesisForm.markAsPristine();
    this.examForm.markAsPristine();
    this.environmentForm.markAsPristine();
    this.impressionForm.markAsPristine();
    this.planForm.markAsPristine();
    this.suppressFormTracking.value = false;
    this.syncEncounterEditability();
    this.configureReactivationGraceTimer();

    this.sectionError = null;
    this.actionError = null;
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
    const linkedClinicalCaseId = this.encounter?.clinicalCaseSummary?.id ?? null;
    const hasLinkedCase = linkedClinicalCaseId !== null;
    const caseOutcome = hasLinkedCase ? (raw.caseOutcome ?? 'CONTINUA') : undefined;
    const requiresFollowUp =
      (raw.requiresFollowUp ?? false) && caseOutcome !== 'RESUELTO' && caseOutcome !== 'CANCELADO';
    const caseLinkMode = hasLinkedCase
      ? 'EXISTING'
      : requiresFollowUp
        ? raw.caseLinkMode ?? 'NONE'
        : 'NONE';
    const clinicalCaseId = hasLinkedCase
      ? linkedClinicalCaseId
      : caseLinkMode === 'EXISTING'
        ? raw.clinicalCaseId ?? null
        : null;
    const problemSummary =
      !hasLinkedCase && caseLinkMode === 'NEW'
        ? raw.problemSummary?.trim() || null
        : null;

    return {
      clinicalPlan: raw.clinicalPlan?.trim() || null,
      requiresFollowUp,
      suggestedFollowUpDate:
        requiresFollowUp && raw.suggestedFollowUpDate?.trim()
          ? raw.suggestedFollowUpDate.trim()
          : undefined,
      caseLinkMode,
      clinicalCaseId,
      problemSummary,
      caseOutcome,
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
          caseLinkMode:
            this.encounter?.plan?.caseLinkMode
            ?? (this.encounter?.clinicalCaseSummary ? 'EXISTING' : 'NONE'),
          clinicalCaseId:
            this.encounter?.plan?.clinicalCaseId
            ?? this.encounter?.clinicalCaseSummary?.id
            ?? null,
          problemSummary: this.trimOrNull(this.encounter?.plan?.problemSummary),
          caseOutcome:
            this.encounter?.plan?.caseOutcome
            ?? (this.encounter?.clinicalCaseSummary ? 'CONTINUA' : undefined),
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

  private toDateTimeLocalValue(value: string | null | undefined): string {
    if (!value) {
      return this.nowDateTimeLocal();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.nowDateTimeLocal();
    }

    const offset = parsed.getTimezoneOffset();
    const local = new Date(parsed.getTime() - offset * 60_000);
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

  private isEncounterStatusEditable(status: EncounterDetail['status'] | null | undefined): boolean {
    return status === 'ACTIVA' || status === 'REACTIVADA';
  }

  private hasReactivationGraceRemaining(encounter: EncounterDetail | null): boolean {
    if (!encounter || encounter.status !== 'FINALIZADA' || !encounter.canReactivate) {
      return false;
    }

    const graceEndsAt = this.toIsoString(encounter.reactivationGraceEndsAt);
    if (!graceEndsAt) {
      return false;
    }

    return new Date(graceEndsAt).getTime() >= Date.now();
  }

  private syncEncounterEditability(): void {
    const forms = [
      this.reasonForm,
      this.anamnesisForm,
      this.examForm,
      this.environmentForm,
      this.impressionForm,
      this.planForm,
      this.vaccinationForm,
      this.treatmentForm,
      this.procedureForm,
    ];
    const editable = this.isEncounterEditable();

    for (const form of forms) {
      if (editable) {
        form.enable({ emitEvent: false });
      } else {
        form.disable({ emitEvent: false });
      }
    }

    if (!editable) {
      this.isVaccinationModalOpen = false;
      this.isTreatmentModalOpen = false;
      this.isProcedureModalOpen = false;
    }
  }

  private configureReactivationGraceTimer(): void {
    this.clearReactivationGraceTimer();

    if (!this.encounter || this.encounter.status !== 'FINALIZADA' || !this.encounter.reactivationGraceEndsAt) {
      return;
    }

    const syncGraceWindow = (): void => {
      if (!this.encounter) {
        this.clearReactivationGraceTimer();
        return;
      }

      const canReactivate = this.hasReactivationGraceRemaining(this.encounter);
      if (this.encounter.canReactivate !== canReactivate) {
        this.encounter = {
          ...this.encounter,
          canReactivate,
        };
        this.cdr.markForCheck();
      }

      if (!canReactivate) {
        this.clearReactivationGraceTimer();
      }
    };

    syncGraceWindow();
    if (this.encounter.canReactivate) {
      this.reactivationGraceTimerId = setInterval(syncGraceWindow, 1000);
    }
  }

  private clearReactivationGraceTimer(): void {
    if (this.reactivationGraceTimerId !== null) {
      clearInterval(this.reactivationGraceTimerId);
      this.reactivationGraceTimerId = null;
    }
  }

  private syncProcedureCatalogSelection(
    item: ProcedureCatalogItem | null,
    options?: { preserveSearchText?: boolean },
  ): void {
    this.procedureForm.controls.catalogId.setValue(item?.id ?? null);

    if (!options?.preserveSearchText) {
      this.procedureCatalogSearch = item ? this.buildProcedureCatalogLabel(item) : '';
    }

    if (item) {
      this.onProcedureCatalogSelected();
    }
  }
}
