import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { GenderEnum } from '../../../domain/enums/index.js';

export class ClientDataDto {
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @IsString({ message: 'Los nombres deben ser texto.' })
  firstName!: string;

  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @IsString({ message: 'Los apellidos deben ser texto.' })
  lastName!: string;

  @IsOptional()
  @IsString({ message: 'El documento de identidad debe ser texto.' })
  documentId?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto.' })
  address?: string;

  @IsOptional()
  @IsEnum(GenderEnum, { message: 'El género debe ser válido (F, M u OTRO).' })
  gender?: GenderEnum;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD).' },
  )
  birthDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto.' })
  notes?: string;
}
