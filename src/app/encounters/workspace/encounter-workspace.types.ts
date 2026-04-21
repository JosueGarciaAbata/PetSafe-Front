export type TabView =
  | 'REASON'
  | 'ANAMNESIS'
  | 'EXAM'
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
