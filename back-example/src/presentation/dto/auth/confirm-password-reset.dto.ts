import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email!: string;

  @IsNotEmpty({ message: 'El código de seguridad es obligatorio.' })
  @IsString({ message: 'El código de seguridad debe ser texto.' })
  code!: string;

  @IsNotEmpty({ message: 'La contraseña nueva es obligatoria.' })
  @IsString({ message: 'La contraseña nueva debe ser texto.' })
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres.' })
  newPassword!: string;
}
