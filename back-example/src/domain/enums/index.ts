export enum GenderEnum {
  F = 'F',
  M = 'M',
  OTRO = 'OTRO',
}

export enum PersonTypeEnum {
  EMPLEADO = 'EMPLEADO',
  CLIENTE = 'CLIENTE',
}

export enum PatientSexEnum {
  MACHO = 'MACHO',
  HEMBRA = 'HEMBRA',
  INTERSEXUAL = 'INTERSEXUAL',
}

export enum AppointmentReasonEnum {
  CONSULTA_GENERAL = 'CONSULTA_GENERAL',
  VACUNACION = 'VACUNACION',
  TRATAMIENTO = 'TRATAMIENTO',
  CIRUGIA = 'CIRUGIA',
  PROCEDIMIENTO = 'PROCEDIMIENTO',
  CONTROL = 'CONTROL',
  EMERGENCIA = 'EMERGENCIA',
}

export enum AppointmentStatusEnum {
  PROGRAMADA = 'PROGRAMADA',
  CONFIRMADA = 'CONFIRMADA',
  EN_PROCESO = 'EN_PROCESO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
  NO_ASISTIO = 'NO_ASISTIO',
}

export enum QueueEntryTypeEnum {
  CON_CITA = 'CON_CITA',
  SIN_CITA = 'SIN_CITA',
  EMERGENCIA = 'EMERGENCIA',
}

export enum QueueStatusEnum {
  EN_ESPERA = 'EN_ESPERA',
  EN_ATENCION = 'EN_ATENCION',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum EncounterStatusEnum {
  ACTIVA = 'ACTIVA',
  FINALIZADA = 'FINALIZADA',
  ANULADA = 'ANULADA',
}

export enum TreatmentStatusEnum {
  ACTIVO = 'ACTIVO',
  FINALIZADO = 'FINALIZADO',
  SUSPENDIDO = 'SUSPENDIDO',
  CANCELADO = 'CANCELADO',
}

export enum TreatmentItemStatusEnum {
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

export enum SurgeryStatusEnum {
  PROGRAMADA = 'PROGRAMADA',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum AntiparasiticTypeEnum {
  INTERNO = 'INTERNO',
  EXTERNO = 'EXTERNO',
  MIXTO = 'MIXTO',
}

export enum VaccineSpeciesEnum {
  PERRO = 'PERRO',
  GATO = 'GATO',
  OTRO = 'OTRO',
}

export enum AppetiteStatusEnum {
  NORMAL = 'NORMAL',
  DISMINUIDO = 'DISMINUIDO',
  AUMENTADO = 'AUMENTADO',
  ANOREXIA = 'ANOREXIA',
}

export enum WaterIntakeStatusEnum {
  NORMAL = 'NORMAL',
  DISMINUIDO = 'DISMINUIDO',
  AUMENTADO = 'AUMENTADO',
}

export enum HydrationStatusEnum {
  NORMAL = 'NORMAL',
  LEVE_DESHIDRATACION = 'LEVE_DESHIDRATACION',
  MODERADA_DESHIDRATACION = 'MODERADA_DESHIDRATACION',
  SEVERA_DESHIDRATACION = 'SEVERA_DESHIDRATACION',
}

export enum MucosaStatusEnum {
  NORMAL = 'NORMAL',
  PALIDA = 'PALIDA',
  ICTERICA = 'ICTERICA',
  CIANOTICA = 'CIANOTICA',
  HIPEREMICA = 'HIPEREMICA',
}

export enum MediaOwnerTypeEnum {
  PACIENTE = 'PACIENTE',
  ATENCION = 'ATENCION',
  USUARIO = 'USUARIO',
}

export enum MediaTypeEnum {
  IMAGEN = 'IMAGEN',
  PDF = 'PDF',
  DOCUMENTO = 'DOCUMENTO',
  VIDEO = 'VIDEO',
  OTRO = 'OTRO',
}

export enum StorageProviderEnum {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  R2 = 'R2',
  CLOUDINARY = 'CLOUDINARY',
  CONTABO_OBJECT_STORAGE = 'CONTABO_OBJECT_STORAGE',
  OTRO = 'OTRO',
}

// ── Application Roles (must match seed data in M11) ──
export enum RoleEnum {
  ADMIN = 'ADMIN',
  MVZ = 'MVZ',
  RECEPCIONISTA = 'RECEPCIONISTA',
  CLIENTE_APP = 'CLIENTE_APP',
}
