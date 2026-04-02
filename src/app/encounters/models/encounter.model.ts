export type AppetiteStatus = 'NORMAL' | 'AUMENTADO' | 'DISMINUIDO' | 'ANOREXIA';
export type WaterIntakeStatus = 'NORMAL' | 'POLIDIPSIA' | 'ADIPSIA';
export type MucosaStatus = 'ROSADAS' | 'PALIDAS' | 'ICTERICAS' | 'CIANOTICAS' | 'CONGESTIVAS';
export type HydrationStatus = 'NORMAL' | 'DESHIDRATACION_LEVE' | 'DESHIDRATACION_MODERADA' | 'DESHIDRATACION_SEVERA';

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
  currentDiet?: string | null;
  reproductiveStatus?: string | null;
  environmentDescription?: string | null;
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
  requiresNextAppointment?: boolean | null;
  suggestedNextAppointmentDate?: string | null;
  planNotes?: string | null;
}

export interface EncounterDetail {
  id: number;
  patientId: number;
  veterinarianId: number;
  queueEntryId: number | null;
  appointmentId: number | null;
  startTime: string;
  endTime: string | null;
  status: string;
  generalNotes: string | null;

  patient: EncounterPatient;

  // Tabs
  consultationReason?: EncounterReason | null;
  anamnesis?: EncounterAnamnesis | null;
  clinicalExam?: EncounterClinicalExam | null;
  environmentalData?: EncounterEnvironmentalData | null;
  clinicalImpression?: EncounterClinicalImpression | null;
  plan?: EncounterPlan | null;

  treatmentsCount: number;
  vaccinesCount: number;
  dewormingCount: number;
  surgeriesCount: number;
  proceduresCount: number;
}

export interface CreateEncounterRequest {
  patientId?: number;
  queueEntryId?: number;
  generalNotes?: string;
}
