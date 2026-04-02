import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateBreedDto {
  @IsNotEmpty({ message: 'El nombre de la raza es obligatorio.' })
  @IsString({ message: 'El nombre de la raza debe ser texto.' })
  name!: string;

  @IsNotEmpty({ message: 'La especie a la que pertenece es obligatoria.' })
  @IsInt({ message: 'La especie proporcionada no es válida.' })
  speciesId!: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;
}
