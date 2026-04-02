import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña proporcionada debe ser texto.' })
  password!: string;
}
