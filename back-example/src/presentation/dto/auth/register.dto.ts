import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { GenderEnum } from '../../../domain/enums/index.js';

export class RegisterDto {
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @IsString({ message: 'Los nombres deben ser texto.' })
  firstName!: string;

  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @IsString({ message: 'Los apellidos deben ser texto.' })
  lastName!: string;

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

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
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD).' })
  birthDate?: string;
}
