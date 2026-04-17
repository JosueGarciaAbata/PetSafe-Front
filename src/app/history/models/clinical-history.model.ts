export type ClinicalHistoryTutor = {
  clientId: number;
  personId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  documentId: string;
  phone: string | null;
  relationship: string | null;
  isPrimary: boolean;
};

export type ClinicalHistoryObservation = {
  id: number;
  type: string;
  name: string;
  description?: string | null;
  active: boolean;
};

export type ClinicalHistoryPatient = {
  id: number;
  name: string;
  species: { id: number; name: string } | null;
  breed: { id: number; name: string } | null;
  color: { id: number; name: string } | null;
  sex: string;
  birthDate: string | null;
  ageYears: number | null;
  currentWeight: number | null;
  sterilized: boolean;
  microchipCode?: string | null;
  generalAllergies: string | null;
  generalHistory: string | null;
  image: { url: string } | null;
  tutors: ClinicalHistoryTutor[];
  clinicalObservations: ClinicalHistoryObservation[];
};

export type ClinicalHistoryConsultationReason = {
  consultationReason: string;
  currentIllnessHistory: string | null;
  referredPreviousDiagnoses: string | null;
  referredPreviousTreatments: string | null;
};

export type ClinicalHistoryAnamnesis = {
  problemStartText: string | null;
  previousSurgeriesText: string | null;
  howProblemStartedText: string | null;
  vaccinesUpToDate: boolean | null;
  dewormingUpToDate: boolean | null;
  hasPetAtHome: boolean | null;
  petAtHomeDetail: string | null;
  administeredMedicationText: string | null;
  appetiteStatus: string | null;
  waterIntakeStatus: string | null;
  fecesText: string | null;
  vomitText: string | null;
  numberOfBowelMovements: number | null;
  urineText: string | null;
  respiratoryProblemsText: string | null;
  difficultyWalkingText: string | null;
  notes: string | null;
};

export type ClinicalHistoryClinicalExam = {
  weightKg: number | null;
  temperatureC: number | null;
  pulse: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  mucousMembranes: string | null;
  lymphNodes: string | null;
  hydration: string | null;
  crtSeconds: number | null;
  examNotes: string | null;
};

export type ClinicalHistoryEnvironmentalData = {
  environmentNotes: string | null;
  nutritionNotes: string | null;
  lifestyleNotes: string | null;
  feedingTypeNotes: string | null;
  notes: string | null;
};

export type ClinicalHistoryClinicalImpression = {
  presumptiveDiagnosis: string | null;
  differentialDiagnosis: string | null;
  prognosis: string | null;
  clinicalNotes: string | null;
};

export type ClinicalHistoryPlan = {
  clinicalPlan: string | null;
  requiresFollowUp: boolean;
  suggestedFollowUpDate: string | null;
  planNotes: string | null;
};

export type ClinicalHistoryVaccinationEvent = {
  id: number;
  vaccineId: number;
  vaccineName: string | null;
  applicationDate: string;
  suggestedNextDate: string | null;
  notes: string | null;
};

export type ClinicalHistoryDewormingEvent = {
  id: number;
  productId: number;
  productName: string | null;
  applicationDate: string;
  suggestedNextDate: string | null;
  notes: string | null;
};

export type ClinicalHistoryTreatmentItem = {
  id: number;
  medication: string;
  dose: string;
  frequency: string;
  durationDays: number;
  administrationRoute: string;
  notes: string | null;
  status: string;
};

export type ClinicalHistoryTreatment = {
  id: number;
  status: string;
  startDate: string;
  endDate: string | null;
  generalInstructions: string | null;
  items: ClinicalHistoryTreatmentItem[];
};

export type ClinicalHistorySurgery = {
  id: number;
  surgeryType: string;
  scheduledDate: string | null;
  performedDate: string | null;
  surgeryStatus: string;
  description: string | null;
  postoperativeInstructions: string | null;
};

export type ClinicalHistoryProcedure = {
  id: number;
  procedureType: string;
  performedDate: string;
  description: string | null;
  result: string | null;
  notes: string | null;
};

export type ClinicalHistoryEncounterItem = {
  id: number;
  startTime: string;
  endTime: string | null;
  status: string;
  generalNotes: string | null;
  vetName: string | null;
  consultationReason: ClinicalHistoryConsultationReason | null;
  anamnesis: ClinicalHistoryAnamnesis | null;
  clinicalExam: ClinicalHistoryClinicalExam | null;
  environmentalData: ClinicalHistoryEnvironmentalData | null;
  clinicalImpression: ClinicalHistoryClinicalImpression | null;
  plan: ClinicalHistoryPlan | null;
  vaccinationEvents: ClinicalHistoryVaccinationEvent[];
  dewormingEvents: ClinicalHistoryDewormingEvent[];
  treatments: ClinicalHistoryTreatment[];
  surgeries: ClinicalHistorySurgery[];
  procedures: ClinicalHistoryProcedure[];
};

export type ClinicalHistoryVaccinationDose = {
  doseOrder: number;
  vaccineName: string | null;
  status: string;
  expectedDate: string | null;
  appliedAt: string | null;
};

export type ClinicalHistoryVaccinationPlan = {
  status: string;
  schemeName: string;
  schemeVersion: number;
  notes: string | null;
  doses: ClinicalHistoryVaccinationDose[];
};

export type ClinicalHistoryResponse = {
  patient: ClinicalHistoryPatient;
  encounters: ClinicalHistoryEncounterItem[];
  vaccinationPlan: ClinicalHistoryVaccinationPlan | null;
};
