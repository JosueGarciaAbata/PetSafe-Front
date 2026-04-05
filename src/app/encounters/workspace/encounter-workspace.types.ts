import {
  CreateEncounterProcedureRequest,
  CreateEncounterTreatmentRequest,
  CreateEncounterVaccinationRequest,
} from '../models/encounter.model';

export type TabView =
  | 'REASON'
  | 'ANAMNESIS'
  | 'EXAM'
  | 'ENVIRONMENT'
  | 'IMPRESSION'
  | 'ACTIONS'
  | 'PLAN';

export type ClinicalTabView = Exclude<TabView, 'ACTIONS'>;
export type ClinicalBlock = 'reason' | 'anamnesis' | 'exam' | 'environment' | 'impression' | 'plan';
export type TabStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export interface TabMeta {
  status: TabStatus;
  error: string | null;
}

export interface TreatmentItemDraft {
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number | null;
  administrationRoute: string;
  notes: string;
}

export interface PendingVaccinationDraft {
  id: string;
  vaccineName: string;
  applicationDate: string;
  suggestedNextDate?: string;
  notes?: string;
  payload: CreateEncounterVaccinationRequest;
}

export interface PendingTreatmentDraft {
  id: string;
  summary: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  payload: CreateEncounterTreatmentRequest;
}

export interface PendingProcedureDraft {
  id: string;
  procedureName: string;
  performedDate: string;
  result?: string;
  notes?: string;
  payload: CreateEncounterProcedureRequest;
}
