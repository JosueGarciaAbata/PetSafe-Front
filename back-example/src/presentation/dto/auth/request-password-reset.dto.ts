import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email!: string;
}
