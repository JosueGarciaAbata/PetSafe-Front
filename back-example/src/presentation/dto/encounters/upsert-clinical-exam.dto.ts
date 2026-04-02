import {
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsString,
  Min,
} from 'class-validator';
import { MucosaStatusEnum, HydrationStatusEnum } from '../../../domain/enums/index.js';

export class UpsertClinicalExamDto {
  @IsOptional()
  @IsNumber({}, { message: 'El peso debe ser un número válido (ej. 12.5).' })
  @Min(0.01, { message: 'El peso debe ser mayor a cero.' })
  weightKg?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La temperatura debe ser un número válido (ej. 38.5).' })
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El pulso no puede ser negativo.' })
  pulse?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'La frecuencia cardíaca no puede ser negativa.' })
  heartRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'La frecuencia respiratoria no puede ser negativa.' })
  respiratoryRate?: number;

  @IsOptional()
  @IsEnum(MucosaStatusEnum, { message: 'El estado de mucosas no es válido. Valores permitidos: ' + Object.values(MucosaStatusEnum).join(', ') })
  mucousMembranes?: MucosaStatusEnum;

  @IsOptional()
  @IsString({ message: 'El estado de ganglios debe ser texto.' })
  lymphNodes?: string;

  @IsOptional()
  @IsEnum(HydrationStatusEnum, { message: 'El estado de hidratación no es válido. Valores permitidos: ' + Object.values(HydrationStatusEnum).join(', ') })
  hydration?: HydrationStatusEnum;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'El TRC no puede ser negativo.' })
  crtSeconds?: number;

  @IsOptional()
  @IsString({ message: 'Las notas del examen deben ser texto.' })
  examNotes?: string;
}
