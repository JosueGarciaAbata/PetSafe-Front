import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CloseEncounterDto {
  @IsNotEmpty({ message: 'Debes indicar la hora en que terminó la atención.' })
  @IsDateString({}, { message: 'La hora de fin debe estar en formato válido (ej. 2026-03-29T17:00:00).' })
  endTime!: string;

  @IsOptional()
  @IsString({ message: 'Las notas generales deben ser texto.' })
  generalNotes?: string;
}
