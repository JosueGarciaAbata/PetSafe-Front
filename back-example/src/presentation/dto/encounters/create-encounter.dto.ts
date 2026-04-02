import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateEncounterDto {
  @IsNotEmpty({ message: 'Debes indicar el paciente.' })
  @IsInt({ message: 'El paciente no es válido.' })
  patientId!: number;

  @IsNotEmpty({ message: 'Debes indicar el veterinario responsable.' })
  @IsInt({ message: 'El veterinario seleccionado no es válido.' })
  vetId!: number;

  @IsNotEmpty({ message: 'La hora de inicio de la atención es obligatoria.' })
  @IsDateString({}, { message: 'La hora de inicio debe estar en formato válido (ej. 2026-03-29T15:00:00).' })
  startTime!: string;

  @IsOptional()
  @IsInt({ message: 'La cita referenciada no es válida.' })
  appointmentId?: number;

  @IsOptional()
  @IsInt({ message: 'La entrada en cola referenciada no es válida.' })
  queueEntryId?: number;

  @IsOptional()
  @IsString({ message: 'Las notas generales deben ser texto.' })
  generalNotes?: string;
}
