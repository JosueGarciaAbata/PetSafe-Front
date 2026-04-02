import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertConsultationReasonDto {
  @IsNotEmpty({ message: 'Debes indicar el motivo de la consulta.' })
  @IsString({ message: 'El motivo de consulta debe ser texto.' })
  consultationReason!: string;

  @IsOptional()
  @IsString({ message: 'La historia de la enfermedad actual debe ser texto.' })
  currentIllnessHistory?: string;

  @IsOptional()
  @IsString({ message: 'Los diagnósticos previos referidos deben ser texto.' })
  referredPreviousDiagnoses?: string;

  @IsOptional()
  @IsString({ message: 'Los tratamientos previos referidos deben ser texto.' })
  referredPreviousTreatments?: string;
}
