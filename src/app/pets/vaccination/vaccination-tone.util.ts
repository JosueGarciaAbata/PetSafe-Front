import {
  PatientVaccinationDoseStatus,
  PatientVaccinationPlan,
} from './models/patient-vaccination-plan.model';

export function buildVaccinationCoverageToneClasses(
  plan: PatientVaccinationPlan | null | undefined,
): string {
  if (!plan) {
    return 'ps-tone ps-tone--neutral ps-tone-fill';
  }

  if (plan.coverage.requiresReview > 0 || plan.coverage.blocked > 0) {
    return 'ps-tone ps-tone--attention ps-tone-fill';
  }

  if (plan.coverage.unknown > 0) {
    return 'ps-tone ps-tone--warning ps-tone-fill';
  }

  if (plan.coverage.coveragePercent >= 80) {
    return 'ps-tone ps-tone--success ps-tone-fill';
  }

  if (plan.coverage.coveragePercent > 0) {
    return 'ps-tone ps-tone--info ps-tone-fill';
  }

  return 'ps-tone ps-tone--neutral ps-tone-fill';
}

export function buildVaccinationDoseToneClasses(
  status: PatientVaccinationDoseStatus,
): string {
  switch (status) {
    case 'APLICADA':
      return 'ps-tone ps-tone--success ps-tone-surface';
    case 'NO_APLICADA':
      return 'ps-tone ps-tone--info ps-tone-surface';
    case 'DESCONOCIDA':
      return 'ps-tone ps-tone--warning ps-tone-surface';
    case 'REQUIERE_REVISION':
      return 'ps-tone ps-tone--attention ps-tone-surface';
    case 'BLOQUEADA':
      return 'ps-tone ps-tone--neutral ps-tone-surface';
    default:
      return 'ps-tone ps-tone--neutral ps-tone-surface';
  }
}
