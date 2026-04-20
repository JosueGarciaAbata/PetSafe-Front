export type ClinicalCaseStatus = 'ABIERTO' | 'CERRADO' | 'CANCELADO';
export type ClinicalCaseFollowUpStatus =
  | 'PROGRAMADO'
  | 'EN_ATENCION'
  | 'COMPLETADO'
  | 'CANCELADO';
export type ClinicalCasePlanLinkMode = 'NONE' | 'EXISTING' | 'NEW';
export type ClinicalCaseOutcome = 'CONTINUA' | 'RESUELTO' | 'CANCELADO';
export type TreatmentEvolutionAction = 'CONTINUA' | 'SUSPENDE' | 'FINALIZA' | 'REEMPLAZA';

export interface ClinicalCaseActiveTreatment {
  id: number;
  encounterId: number;
  status: string;
  summary: string;
  startDate: string;
  endDate: string | null;
}

export interface ClinicalCaseLastEvolution {
  id: number;
  encounterId: number;
  treatmentId: number;
  treatmentSummary: string;
  eventType: TreatmentEvolutionAction;
  notes: string | null;
  replacementTreatmentId: number | null;
  replacementTreatmentSummary: string | null;
  createdAt: string;
}

export interface ClinicalCaseNextFollowUp {
  id: number;
  sourceEncounterId: number;
  targetEncounterId: number | null;
  suggestedDate: string;
  status: ClinicalCaseFollowUpStatus;
  appointmentId: number | null;
  appointmentScheduledDate: string | null;
  appointmentScheduledTime: string | null;
  appointmentEndTime: string | null;
  appointmentStatus: string | null;
}

export interface ClinicalCaseConsultationSummary {
  id: number;
  patientConsultationNumber: number;
  startTime: string;
  status: string;
  consultationReason: string | null;
  clinicianName: string | null;
}

export interface ClinicalCaseSummary {
  id: number;
  patientId: number;
  originEncounterId: number;
  status: ClinicalCaseStatus;
  problemSummary: string;
  openedAt: string;
  closedAt: string | null;
  canceledAt: string | null;
  latestImpression: string | null;
  nextFollowUp: ClinicalCaseNextFollowUp | null;
  lastEvolution: ClinicalCaseLastEvolution | null;
  activeTreatments: ClinicalCaseActiveTreatment[];
  consultationsCount: number;
}

export interface ClinicalCaseDetail extends ClinicalCaseSummary {
  consultations: ClinicalCaseConsultationSummary[];
  followUps: ClinicalCaseNextFollowUp[];
}
