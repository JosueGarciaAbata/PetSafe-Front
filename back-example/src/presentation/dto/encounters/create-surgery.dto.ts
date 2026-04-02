import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsInt,
} from 'class-validator';
import { SurgeryStatusEnum } from '../../../domain/enums/index.js';

export class CreateSurgeryDto {
  @IsOptional()
  @IsInt({ message: 'El ID de la cirugía del catálogo debe ser un entero.' })
  catalogId?: number;

  @IsOptional()
  @IsString({ message: 'El tipo de cirugía debe ser texto.' })
  surgeryType?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha programada debe estar en formato válido (ej. 2026-04-15T10:00:00).' })
  scheduledDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de realización debe estar en formato válido.' })
  performedDate?: string;

  @IsOptional()
  @IsEnum(SurgeryStatusEnum, { message: 'El estado de la cirugía no es válido. Valores: ' + Object.values(SurgeryStatusEnum).join(', ') })
  surgeryStatus?: SurgeryStatusEnum;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Las instrucciones postoperatorias deben ser texto.' })
  postoperativeInstructions?: string;
}
