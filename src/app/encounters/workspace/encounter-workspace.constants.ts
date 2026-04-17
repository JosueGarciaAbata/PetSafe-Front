import { ClinicalBlock, ClinicalTabView, TabView } from './encounter-workspace.types';

export const CLINICAL_TEXT_MAX_LENGTH = 255;
export const CLINICAL_SHORT_TEXT_MAX_LENGTH = 120;
export const CLINICAL_TEMPERATURE_MIN = 20;
export const CLINICAL_TEMPERATURE_MAX = 50;

export const ENCOUNTER_TAB_ORDER: readonly TabView[] = [
  'REASON',
  'ANAMNESIS',
  'EXAM',
  'ENVIRONMENT',
  'IMPRESSION',
  'ACTIONS',
  'PLAN',
];

export const ENCOUNTER_TAB_LABELS: Record<TabView, string> = {
  REASON: 'Motivo',
  ANAMNESIS: 'Anamnesis',
  EXAM: 'Examen clínico',
  ENVIRONMENT: 'Entorno',
  IMPRESSION: 'Impresión',
  ACTIONS: 'Acciones',
  PLAN: 'Plan',
};

export const TAB_BY_BLOCK: Record<ClinicalBlock, ClinicalTabView> = {
  reason: 'REASON',
  anamnesis: 'ANAMNESIS',
  exam: 'EXAM',
  environment: 'ENVIRONMENT',
  impression: 'IMPRESSION',
  plan: 'PLAN',
};
