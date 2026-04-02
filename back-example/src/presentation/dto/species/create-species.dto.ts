import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateSpeciesDto {
  @IsNotEmpty({ message: 'El grupo zootécnico es obligatorio.' })
  @IsInt({ message: 'El grupo zootécnico proporcionado no es válido.' })
  zootecnicalGroupId!: number;

  @IsNotEmpty({ message: 'El nombre de la especie es obligatorio.' })
  @IsString({ message: 'El nombre de la especie debe ser texto.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;
}
