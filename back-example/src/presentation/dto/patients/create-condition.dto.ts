import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateConditionDto {
  @IsNotEmpty({ message: 'El tipo de condición es obligatorio.' })
  @IsString({ message: 'El tipo debe ser un texto válido.' })
  type!: string; 

  @IsNotEmpty({ message: 'El nombre de la condición es obligatorio.' })
  @IsString({ message: 'El nombre debe ser un texto válido.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto.' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  active?: boolean;
}
