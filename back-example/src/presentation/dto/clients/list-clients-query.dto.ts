import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class ListClientsQueryDto {
  @IsOptional()
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser mayor a 0.' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser mayor a 0.' })
  @Max(100, { message: 'El límite no puede exceder 100.' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Los nombres deben ser texto.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'La cédula debe ser texto.' })
  documentId?: string;

  @IsOptional()
  @IsString({ message: 'El correo debe ser texto.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'El nombre de la mascota debe ser texto.' })
  petName?: string;
}
