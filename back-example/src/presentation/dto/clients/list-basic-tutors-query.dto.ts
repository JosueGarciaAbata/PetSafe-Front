import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListBasicTutorsQueryDto {
  @IsOptional()
  @IsString({ message: 'El criterio de búsqueda debe ser texto.' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser mayor a 0.' })
  @Max(20, { message: 'El límite no puede exceder 20.' })
  limit?: number;
}
