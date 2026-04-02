import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';

export class CreateVaccinationEventDto {
  @IsNotEmpty({ message: 'Debes seleccionar una vacuna del catálogo.' })
  @IsInt({ message: 'La vacuna seleccionada no es válida.' })
  vaccineId!: number;

  @IsNotEmpty({ message: 'La fecha de aplicación de la vacuna es obligatoria.' })
  @IsDateString({}, { message: 'La fecha de aplicación debe estar en formato válido (ej. 2026-03-29).' })
  applicationDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de próxima dosis debe estar en formato válido (ej. 2027-03-29).' })
  suggestedNextDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto.' })
  notes?: string;
}
