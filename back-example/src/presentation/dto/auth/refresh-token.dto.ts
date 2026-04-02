import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'El token de actualización es obligatorio.' })
  @IsString({ message: 'El token proporcionado no es válido.' })
  refreshToken!: string;
}
