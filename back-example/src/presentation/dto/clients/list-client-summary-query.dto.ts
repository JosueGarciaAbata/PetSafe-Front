import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListClientSummaryQueryDto {
  @IsOptional()
  @IsString({ message: 'El criterio de busqueda debe ser texto.' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La pagina debe ser un numero entero.' })
  @Min(1, { message: 'La pagina debe ser mayor a 0.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El limite debe ser un numero entero.' })
  @Min(1, { message: 'El limite debe ser mayor a 0.' })
  @Max(100, { message: 'El limite no puede exceder 100.' })
  limit?: number;
}
