import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateVaccineDto {
  @IsNotEmpty({ message: 'El nombre de la vacuna es obligatorio.' })
  @IsString()
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  name!: string;

  @IsNotEmpty({ message: 'El ID de la especie es obligatorio.' })
  @IsInt({ message: 'speciesId debe ser un entero.' })
  speciesId!: number;

  @IsOptional()
  @IsBoolean({ message: 'isRevaccination debe ser verdadero o falso.' })
  isRevaccination?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isMandatory debe ser verdadero o falso.' })
  isMandatory?: boolean;

  /**
   * Posición en el esquema de dosis (1 = primera dosis, 2 = segunda, etc.).
   * Solo relevante si la vacuna tiene esquema multi-dosis.
   */
  @IsOptional()
  @IsInt({ message: 'doseOrder debe ser un entero.' })
  @Min(1)
  doseOrder?: number;
}
