import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateVaccineDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'isRevaccination debe ser verdadero o falso.' })
  isRevaccination?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isMandatory debe ser verdadero o falso.' })
  isMandatory?: boolean;

  /**
   * Enviar null para quitar el orden de dosis.
   * Enviar un entero >= 1 para establecerlo.
   */
  @IsOptional()
  @IsInt({ message: 'doseOrder debe ser un entero.' })
  @Min(1)
  doseOrder?: number | null;
}
