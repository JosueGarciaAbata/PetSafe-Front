import { EncounterStatusEnum, TreatmentStatusEnum, SurgeryStatusEnum } from '../../../domain/enums/index.js';

// ── Sub-response types ──────────────────────────────────────────────────────

export class ConsultationReasonResponseDto {
  consultationReason!: string;
  currentIllnessHistory!: string | null;
  referredPreviousDiagnoses!: string | null;
  referredPreviousTreatments!: string | null;
}

export class AnamnesisResponseDto {
  problemStartText!: string | null;
  previousSurgeriesText!: string | null;
  howProblemStartedText!: string | null;
  vaccinesUpToDate!: boolean | null;
  dewormingUpToDate!: boolean | null;
  hasPetAtHome!: boolean | null;
  petAtHomeDetail!: string | null;
  administeredMedicationText!: string | null;
  appetiteStatus!: string | null;
  waterIntakeStatus!: string | null;
  fecesText!: string | null;
  vomitText!: string | null;
  numberOfBowelMovements!: number | null;
  urineText!: string | null;
  respiratoryProblemsText!: string | null;
  difficultyWalkingText!: string | null;
  notes!: string | null;
}

export class ClinicalExamResponseDto {
  weightKg!: number | null;
  temperatureC!: number | null;
  pulse!: number | null;
  heartRate!: number | null;
  respiratoryRate!: number | null;
  mucousMembranes!: string | null;
  lymphNodes!: string | null;
  hydration!: string | null;
  crtSeconds!: number | null;
  examNotes!: string | null;
}

export class EnvironmentalDataResponseDto {
  environmentNotes!: string | null;
  nutritionNotes!: string | null;
  lifestyleNotes!: string | null;
  feedingTypeNotes!: string | null;
  notes!: string | null;
}

export class ClinicalImpressionResponseDto {
  presumptiveDiagnosis!: string | null;
  differentialDiagnosis!: string | null;
  prognosis!: string | null;
  clinicalNotes!: string | null;
}

export class PlanResponseDto {
  clinicalPlan!: string | null;
  requiresFollowUp!: boolean;
  suggestedFollowUpDate!: string | null;
  planNotes!: string | null;
}

export class VaccinationEventResponseDto {
  id!: number;
  vaccineId!: number;
  vaccineName!: string | null;
  applicationDate!: string;
  suggestedNextDate!: string | null;
  notes!: string | null;
}

export class DewormingEventResponseDto {
  id!: number;
  productId!: number;
  productName!: string | null;
  applicationDate!: string;
  suggestedNextDate!: string | null;
  notes!: string | null;
}

export class TreatmentItemResponseDto {
  id!: number;
  medication!: string;
  dose!: string;
  frequency!: string;
  durationDays!: number;
  administrationRoute!: string;
  notes!: string | null;
  status!: string;
}

export class TreatmentResponseDto {
  id!: number;
  status!: TreatmentStatusEnum;
  startDate!: string;
  endDate!: string | null;
  generalInstructions!: string | null;
  items!: TreatmentItemResponseDto[];
}

export class SurgeryResponseDto {
  id!: number;
  surgeryType!: string;
  scheduledDate!: string | null;
  performedDate!: string | null;
  surgeryStatus!: SurgeryStatusEnum;
  description!: string | null;
  postoperativeInstructions!: string | null;
}

export class ProcedureResponseDto {
  id!: number;
  procedureType!: string;
  performedDate!: string;
  description!: string | null;
  result!: string | null;
  notes!: string | null;
}

// ── Main response ──────────────────────────────────────────────────────────

export class EncounterResponseDto {
  id!: number;
  patientId!: number;
  vetId!: number;
  appointmentId!: number | null;
  queueEntryId!: number | null;
  startTime!: string;
  endTime!: string | null;
  status!: EncounterStatusEnum;
  generalNotes!: string | null;
  createdByUserId!: number | null;

  consultationReason!: ConsultationReasonResponseDto | null;
  anamnesis!: AnamnesisResponseDto | null;
  clinicalExam!: ClinicalExamResponseDto | null;
  environmentalData!: EnvironmentalDataResponseDto | null;
  clinicalImpression!: ClinicalImpressionResponseDto | null;
  plan!: PlanResponseDto | null;

  vaccinationEvents!: VaccinationEventResponseDto[];
  dewormingEvents!: DewormingEventResponseDto[];
  treatments!: TreatmentResponseDto[];
  surgeries!: SurgeryResponseDto[];
  procedures!: ProcedureResponseDto[];

  createdAt!: string;
  updatedAt!: string;
}

export class EncounterListItemDto {
  id!: number;
  patientId!: number;
  vetId!: number;
  startTime!: string;
  endTime!: string | null;
  status!: EncounterStatusEnum;
  generalNotes!: string | null;
  createdAt!: string;
}
