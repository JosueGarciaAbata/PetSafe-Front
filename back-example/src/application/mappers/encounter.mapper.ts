import { Encounter } from '../../domain/entities/encounters/encounter.entity.js';
import { EncounterAnamnesis } from '../../domain/entities/encounters/encounter-anamnesis.entity.js';
import { EncounterClinicalExam } from '../../domain/entities/encounters/encounter-clinical-exam.entity.js';
import { EncounterConsultationReason } from '../../domain/entities/encounters/encounter-consultation-reason.entity.js';
import { EncounterEnvironmentalData } from '../../domain/entities/encounters/encounter-environmental-data.entity.js';
import { EncounterClinicalImpression } from '../../domain/entities/encounters/encounter-clinical-impression.entity.js';
import { EncounterPlan } from '../../domain/entities/encounters/encounter-plan.entity.js';
import { VaccinationEvent } from '../../domain/entities/encounters/vaccination-event.entity.js';
import { DewormingEvent } from '../../domain/entities/encounters/deworming-event.entity.js';
import { Treatment } from '../../domain/entities/encounters/treatment.entity.js';
import { TreatmentItem } from '../../domain/entities/encounters/treatment-item.entity.js';
import { Surgery } from '../../domain/entities/encounters/surgery.entity.js';
import { Procedure } from '../../domain/entities/encounters/procedure.entity.js';
import {
  EncounterResponseDto,
  EncounterListItemDto,
  ConsultationReasonResponseDto,
  AnamnesisResponseDto,
  ClinicalExamResponseDto,
  EnvironmentalDataResponseDto,
  ClinicalImpressionResponseDto,
  PlanResponseDto,
  VaccinationEventResponseDto,
  DewormingEventResponseDto,
  TreatmentResponseDto,
  TreatmentItemResponseDto,
  SurgeryResponseDto,
  ProcedureResponseDto,
} from '../../presentation/dto/encounters/encounter-response.dto.js';

const toDate = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
};

export class EncounterMapper {
  static toConsultationReasonDto(e: EncounterConsultationReason): ConsultationReasonResponseDto {
    return {
      consultationReason: e.consultationReason,
      currentIllnessHistory: e.currentIllnessHistory ?? null,
      referredPreviousDiagnoses: e.referredPreviousDiagnoses ?? null,
      referredPreviousTreatments: e.referredPreviousTreatments ?? null,
    };
  }

  static toAnamnesisDto(e: EncounterAnamnesis): AnamnesisResponseDto {
    return {
      problemStartText: e.problemStartText ?? null,
      previousSurgeriesText: e.previousSurgeriesText ?? null,
      howProblemStartedText: e.howProblemStartedText ?? null,
      vaccinesUpToDate: e.vaccinesUpToDate ?? null,
      dewormingUpToDate: e.dewormingUpToDate ?? null,
      hasPetAtHome: e.hasPetAtHome ?? null,
      petAtHomeDetail: e.petAtHomeDetail ?? null,
      administeredMedicationText: e.administeredMedicationText ?? null,
      appetiteStatus: e.appetiteStatus ?? null,
      waterIntakeStatus: e.waterIntakeStatus ?? null,
      fecesText: e.fecesText ?? null,
      vomitText: e.vomitText ?? null,
      numberOfBowelMovements: e.numberOfBowelMovements ?? null,
      urineText: e.urineText ?? null,
      respiratoryProblemsText: e.respiratoryProblemsText ?? null,
      difficultyWalkingText: e.difficultyWalkingText ?? null,
      notes: e.notes ?? null,
    };
  }

  static toClinicalExamDto(e: EncounterClinicalExam): ClinicalExamResponseDto {
    return {
      weightKg: e.weightKg !== undefined ? Number(e.weightKg) : null,
      temperatureC: e.temperatureC !== undefined ? Number(e.temperatureC) : null,
      pulse: e.pulse ?? null,
      heartRate: e.heartRate ?? null,
      respiratoryRate: e.respiratoryRate ?? null,
      mucousMembranes: e.mucousMembranes ?? null,
      lymphNodes: e.lymphNodes ?? null,
      hydration: e.hydration ?? null,
      crtSeconds: e.crtSeconds ?? null,
      examNotes: e.examNotes ?? null,
    };
  }

  static toEnvironmentalDataDto(e: EncounterEnvironmentalData): EnvironmentalDataResponseDto {
    return {
      environmentNotes: e.environmentNotes ?? null,
      nutritionNotes: e.nutritionNotes ?? null,
      lifestyleNotes: e.lifestyleNotes ?? null,
      feedingTypeNotes: e.feedingTypeNotes ?? null,
      notes: e.notes ?? null,
    };
  }

  static toClinicalImpressionDto(e: EncounterClinicalImpression): ClinicalImpressionResponseDto {
    return {
      presumptiveDiagnosis: e.presumptiveDiagnosis ?? null,
      differentialDiagnosis: e.differentialDiagnosis ?? null,
      prognosis: e.prognosis ?? null,
      clinicalNotes: e.clinicalNotes ?? null,
    };
  }

  static toPlanDto(e: EncounterPlan): PlanResponseDto {
    return {
      clinicalPlan: e.clinicalPlan ?? null,
      requiresFollowUp: e.requiresFollowUp,
      suggestedFollowUpDate: e.suggestedFollowUpDate ? toDate(e.suggestedFollowUpDate) : null,
      planNotes: e.planNotes ?? null,
    };
  }

  static toVaccinationEventDto(e: VaccinationEvent): VaccinationEventResponseDto {
    return {
      id: e.id,
      vaccineId: e.vaccineId,
      vaccineName: e.vaccine?.name ?? null,
      applicationDate: toDate(e.applicationDate)!,
      suggestedNextDate: e.suggestedNextDate ? toDate(e.suggestedNextDate) : null,
      notes: e.notes ?? null,
    };
  }

  static toDewormingEventDto(e: DewormingEvent): DewormingEventResponseDto {
    return {
      id: e.id,
      productId: e.productId,
      productName: e.product?.name ?? null,
      applicationDate: toDate(e.applicationDate)!,
      suggestedNextDate: e.suggestedNextDate ? toDate(e.suggestedNextDate) : null,
      notes: e.notes ?? null,
    };
  }

  static toTreatmentItemDto(e: TreatmentItem): TreatmentItemResponseDto {
    return {
      id: e.id,
      medication: e.medication,
      dose: e.dose,
      frequency: e.frequency,
      durationDays: e.durationDays,
      administrationRoute: e.administrationRoute,
      notes: e.notes ?? null,
      status: e.status,
    };
  }

  static toTreatmentDto(e: Treatment): TreatmentResponseDto {
    return {
      id: e.id,
      status: e.status,
      startDate: toDate(e.startDate)!,
      endDate: e.endDate ? toDate(e.endDate) : null,
      generalInstructions: e.generalInstructions ?? null,
      items: (e.items ?? []).map((i) => this.toTreatmentItemDto(i)),
    };
  }

  static toSurgeryDto(e: Surgery): SurgeryResponseDto {
    return {
      id: e.id,
      surgeryType: e.surgeryType,
      scheduledDate: e.scheduledDate ? toDate(e.scheduledDate) : null,
      performedDate: e.performedDate ? toDate(e.performedDate) : null,
      surgeryStatus: e.surgeryStatus,
      description: e.description ?? null,
      postoperativeInstructions: e.postoperativeInstructions ?? null,
    };
  }

  static toProcedureDto(e: Procedure): ProcedureResponseDto {
    return {
      id: e.id,
      procedureType: e.procedureType,
      performedDate: toDate(e.performedDate)!,
      description: e.description ?? null,
      result: e.result ?? null,
      notes: e.notes ?? null,
    };
  }

  static toResponseDto(enc: Encounter): EncounterResponseDto {
    return {
      id: enc.id,
      patientId: enc.patientId,
      vetId: enc.vetId,
      appointmentId: enc.appointmentId ?? null,
      queueEntryId: enc.queueEntryId ?? null,
      startTime: toDate(enc.startTime)!,
      endTime: enc.endTime ? toDate(enc.endTime) : null,
      status: enc.status,
      generalNotes: enc.generalNotes ?? null,
      createdByUserId: enc.createdByUserId ?? null,

      consultationReason: enc.consultationReason
        ? this.toConsultationReasonDto(enc.consultationReason)
        : null,
      anamnesis: enc.anamnesis ? this.toAnamnesisDto(enc.anamnesis) : null,
      clinicalExam: enc.clinicalExam ? this.toClinicalExamDto(enc.clinicalExam) : null,
      environmentalData: enc.environmentalData
        ? this.toEnvironmentalDataDto(enc.environmentalData)
        : null,
      clinicalImpression: enc.clinicalImpression
        ? this.toClinicalImpressionDto(enc.clinicalImpression)
        : null,
      plan: enc.plan ? this.toPlanDto(enc.plan) : null,

      vaccinationEvents: (enc.vaccinationEvents ?? []).map((v) => this.toVaccinationEventDto(v)),
      dewormingEvents: (enc.dewormingEvents ?? []).map((d) => this.toDewormingEventDto(d)),
      treatments: (enc.treatments ?? []).map((t) => this.toTreatmentDto(t)),
      surgeries: (enc.surgeries ?? []).map((s) => this.toSurgeryDto(s)),
      procedures: (enc.procedures ?? []).map((p) => this.toProcedureDto(p)),

      createdAt: toDate(enc.createdAt)!,
      updatedAt: toDate(enc.updatedAt)!,
    };
  }

  static toListItemDto(enc: Encounter): EncounterListItemDto {
    return {
      id: enc.id,
      patientId: enc.patientId,
      vetId: enc.vetId,
      startTime: toDate(enc.startTime)!,
      endTime: enc.endTime ? toDate(enc.endTime) : null,
      status: enc.status,
      generalNotes: enc.generalNotes ?? null,
      createdAt: toDate(enc.createdAt)!,
    };
  }
}
