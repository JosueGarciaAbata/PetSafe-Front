import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @IsNotEmpty({ message: 'El token de actualización es obligatorio.' })
  @IsString({ message: 'El token proporcionado no es válido.' })
  refreshToken!: string;
}
