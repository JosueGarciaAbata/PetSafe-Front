import {
  ClinicalCaseOutcome,
  ClinicalCasePlanLinkMode,
  ClinicalCaseSummary,
  TreatmentEvolutionAction,
} from '@app/clinical-cases/models/clinical-case.model';

export type AppetiteStatus = 'NORMAL' | 'AUMENTADO' | 'DISMINUIDO' | 'ANOREXIA';
export type WaterIntakeStatus = 'NORMAL' | 'AUMENTADO' | 'DISMINUIDO';
export type MucosaStatus =
  | 'NORMAL'
  | 'PALIDA'
  | 'ICTERICA'
  | 'CIANOTICA'
  | 'HIPEREMICA';
export type HydrationStatus =
  | 'NORMAL'
  | 'LEVE_DESHIDRATACION'
  | 'MODERADA_DESHIDRATACION'
  | 'SEVERA_DESHIDRATACION';
export type EncounterStatus = 'ACTIVA' | 'REACTIVADA' | 'FINALIZADA' | 'ANULADA';
export type TreatmentStatus = 'ACTIVO' | 'FINALIZADO' | 'SUSPENDIDO' | 'CANCELADO';
export type TreatmentItemStatus = 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'CANCELADO';

export interface EncounterPatient {
  id: number;
  name: string;
  species: string;
  breed: string;
}

export interface EncounterReason {
  consultationReason?: string | null;
  currentIllnessHistory?: string | null;
  referredPreviousDiagnoses?: string | null;
  referredPreviousTreatments?: string | null;
}

export interface EncounterAnamnesis {
  problemStartText?: string | null;
  previousSurgeriesText?: string | null;
  howProblemStartedText?: string | null;
  vaccinesUpToDate?: boolean | null;
  dewormingUpToDate?: boolean | null;
  hasPetAtHome?: boolean | null;
  petAtHomeDetail?: string | null;
  administeredMedicationText?: string | null;
  appetiteStatus?: AppetiteStatus | null;
  waterIntakeStatus?: WaterIntakeStatus | null;
  fecesText?: string | null;
  vomitText?: string | null;
  numberOfBowelMovements?: number | null;
  urineText?: string | null;
  respiratoryProblemsText?: string | null;
  difficultyWalkingText?: string | null;
  notes?: string | null;
}

export interface EncounterClinicalExam {
  weightKg?: number | null;
  temperatureC?: number | null;
  pulse?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  mucousMembranes?: MucosaStatus | null;
  lymphNodes?: string | null;
  hydration?: HydrationStatus | null;
  crtSeconds?: number | null;
  examNotes?: string | null;
}

export interface EncounterEnvironmentalData {
  environmentNotes?: string | null;
  nutritionNotes?: string | null;
  lifestyleNotes?: string | null;
  feedingTypeNotes?: string | null;
  notes?: string | null;
}

export interface EncounterClinicalImpression {
  presumptiveDiagnosis?: string | null;
  differentialDiagnosis?: string | null;
  prognosis?: string | null;
  clinicalNotes?: string | null;
}

export interface EncounterPlan {
  clinicalPlan?: string | null;
  requiresFollowUp?: boolean | null;
  suggestedFollowUpDate?: string | null;
  caseLinkMode?: ClinicalCasePlanLinkMode | null;
  clinicalCaseId?: number | null;
  problemSummary?: string | null;
  caseOutcome?: ClinicalCaseOutcome | null;
  planNotes?: string | null;
}

export interface EncounterVaccinationEvent {
  id: number;
  vaccineId: number;
  vaccineName: string | null;
  applicationDate: string;
  suggestedNextDate: string | null;
  notes: string | null;
}

export interface EncounterVaccinationDraft {
  id: number;
  planDoseId: number | null;
  vaccineId: number;
  vaccineName: string | null;
  applicationDate: string;
  suggestedNextDate: string | null;
  notes: string | null;
}

export interface EncounterDewormingEvent {
  id: number;
  productId: number;
  productName: string | null;
  applicationDate: string;
  suggestedNextDate: string | null;
  notes: string | null;
}

export interface EncounterTreatmentItem {
  id: number;
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes: string | null;
  status: TreatmentItemStatus;
}

export interface EncounterTreatment {
  id: number;
  status: TreatmentStatus;
  startDate: string;
  endDate: string | null;
  generalInstructions: string | null;
  replacesTreatmentId: number | null;
  items: EncounterTreatmentItem[];
}

export interface EncounterTreatmentDraftItem {
  id: number;
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes: string | null;
  status: TreatmentItemStatus;
}

export interface EncounterTreatmentDraft {
  id: number;
  startDate: string;
  endDate: string | null;
  generalInstructions: string | null;
  replacesTreatmentId: number | null;
  items: EncounterTreatmentDraftItem[];
}

export interface EncounterTreatmentReviewDraft {
  id: number;
  sourceTreatmentId: number;
  sourceTreatmentSummary: string;
  action: Exclude<TreatmentEvolutionAction, 'REEMPLAZA'>;
  notes: string | null;
}

export interface EncounterTreatmentEvolutionEvent {
  id: number;
  treatmentId: number;
  treatmentSummary: string;
  eventType: TreatmentEvolutionAction;
  notes: string | null;
  replacementTreatmentId: number | null;
  replacementTreatmentSummary: string | null;
  createdAt: string;
}

export interface EncounterProcedure {
  id: number;
  procedureType: string;
  performedDate: string;
  description: string | null;
  result: string | null;
  notes: string | null;
}

export interface EncounterProcedureDraft {
  id: number;
  catalogId: number | null;
  procedureType: string | null;
  performedDate: string;
  description: string | null;
  result: string | null;
  notes: string | null;
}

export interface EncounterSurgery {
  id: number;
  surgeryType: string;
  scheduledDate: string | null;
  performedDate: string | null;
  surgeryStatus: string;
  description: string | null;
  postoperativeInstructions: string | null;
}

export interface ProcedureCatalogItem {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateEncounterRequest {
  patientId?: number;
  vetId?: number;
  appointmentId?: number | null;
  queueEntryId?: number;
  startTime?: string;
  generalNotes?: string;
}

export interface CreateEncounterVaccinationRequest {
  planDoseId?: number;
  vaccineId: number;
  applicationDate: string;
  suggestedNextDate?: string;
  notes?: string;
}

export interface CreateEncounterTreatmentItemRequest {
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes?: string;
}

export interface CreateEncounterTreatmentRequest {
  startDate: string;
  endDate?: string;
  generalInstructions?: string;
  replacesTreatmentId?: number;
  items?: CreateEncounterTreatmentItemRequest[];
}

export interface CreateEncounterProcedureRequest {
  catalogId?: number;
  procedureType?: string;
  performedDate: string;
  description?: string;
  result?: string;
  notes?: string;
}

export interface EncounterDetail {
  id: number;
  patientId: number;
  vetId: number;
  veterinarianId: number;
  queueEntryId: number | null;
  appointmentId: number | null;
  startTime: string;
  endTime: string | null;
  status: EncounterStatus;
  canReactivate: boolean;
  reactivationGraceEndsAt: string | null;
  generalNotes: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  patient: EncounterPatient;
  consultationReason?: EncounterReason | null;
  anamnesis?: EncounterAnamnesis | null;
  clinicalExam?: EncounterClinicalExam | null;
  environmentalData?: EncounterEnvironmentalData | null;
  clinicalImpression?: EncounterClinicalImpression | null;
  plan?: EncounterPlan | null;
  clinicalCaseSummary: ClinicalCaseSummary | null;
  vaccinationEvents: EncounterVaccinationEvent[];
  vaccinationDrafts: EncounterVaccinationDraft[];
  dewormingEvents: EncounterDewormingEvent[];
  treatments: EncounterTreatment[];
  treatmentDrafts: EncounterTreatmentDraft[];
  treatmentReviewDrafts: EncounterTreatmentReviewDraft[];
  treatmentEvolutionEvents: EncounterTreatmentEvolutionEvent[];
  surgeries: EncounterSurgery[];
  procedures: EncounterProcedure[];
  procedureDrafts: EncounterProcedureDraft[];
  treatmentsCount: number;
  vaccinesCount: number;
  dewormingCount: number;
  surgeriesCount: number;
  proceduresCount: number;
}

export interface EncounterAttachment {
  id: number;
  url: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  mediaType: string;
  createdAt: string;
}
