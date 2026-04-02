import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';

export class CreateDewormingEventDto {
  @IsNotEmpty({ message: 'Debes seleccionar un antiparasitario del catálogo.' })
  @IsInt({ message: 'El antiparasitario seleccionado no es válido.' })
  productId!: number;

  @IsNotEmpty({ message: 'La fecha de aplicación del antiparasitario es obligatoria.' })
  @IsDateString({}, { message: 'La fecha de aplicación debe estar en formato válido (ej. 2026-03-29).' })
  applicationDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de próxima aplicación debe estar en formato válido.' })
  suggestedNextDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto.' })
  notes?: string;
}
