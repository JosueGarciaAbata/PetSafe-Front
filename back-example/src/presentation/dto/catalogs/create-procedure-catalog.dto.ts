import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProcedureCatalogDto {
  @IsNotEmpty({ message: 'El nombre del procedimiento es obligatorio.' })
  @IsString({ message: 'El nombre debe ser texto.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;
}
