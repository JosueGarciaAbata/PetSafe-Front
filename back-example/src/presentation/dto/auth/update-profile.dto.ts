import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { GenderEnum } from '../../../domain/enums/index.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Los nombres deben ser texto.' })
  @IsNotEmpty({ message: 'Los nombres no pueden estar vacíos.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser texto.' })
  @IsNotEmpty({ message: 'Los apellidos no pueden estar vacíos.' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email?: string;

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
