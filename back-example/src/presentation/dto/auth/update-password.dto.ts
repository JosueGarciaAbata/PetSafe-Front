import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  @IsString({ message: 'La contraseña actual debe ser texto.' })
  currentPassword!: string;

  @IsNotEmpty({ message: 'La contraseña nueva es obligatoria.' })
  @IsString({ message: 'La contraseña nueva debe ser texto.' })
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres.' })
  newPassword!: string;
}
