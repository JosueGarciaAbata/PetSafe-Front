import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSurgeryCatalogDto {
  @IsNotEmpty({ message: 'El nombre de la cirugía es obligatorio.' })
  @IsString({ message: 'El nombre debe ser texto.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'requiresAnesthesia debe ser booleano.' })
  requiresAnesthesia?: boolean;
}
