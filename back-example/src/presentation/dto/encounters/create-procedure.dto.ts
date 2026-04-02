import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
} from 'class-validator';

export class CreateProcedureDto {
  @IsOptional()
  @IsInt({ message: 'El ID de procedimiento del catálogo debe ser un entero.' })
  catalogId?: number;

  @IsOptional()
  @IsString({ message: 'El tipo de procedimiento debe ser texto.' })
  procedureType?: string;

  @IsNotEmpty({ message: 'La fecha en que se realizó el procedimiento es obligatoria.' })
  @IsDateString({}, { message: 'La fecha de realización debe estar en formato válido (ej. 2026-03-29T16:00:00).' })
  performedDate!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'El resultado debe ser texto.' })
  result?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto.' })
  notes?: string;
}
