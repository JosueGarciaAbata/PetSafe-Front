import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class ListPatientTutorQueryDto {

  @IsOptional()
  @IsString({ message: 'El criterio de busqueda debe ser texto.' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser mayor a 0.' })
  @Max(20, { message: 'El límite no puede exceder 20.' })
  limit?: number;
}