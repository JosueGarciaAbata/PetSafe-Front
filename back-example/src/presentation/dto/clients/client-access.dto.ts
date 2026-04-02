import { IsEmail, IsNotEmpty } from 'class-validator';

export class ClientAccessDto {
  @IsNotEmpty({ message: 'El correo electrónico del usuario es obligatorio.' })
  @IsEmail({}, { message: 'Por favor, ingrese un correo electrónico válido.' })
  email!: string;
}
