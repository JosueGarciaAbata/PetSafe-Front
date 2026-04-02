import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsInt,
} from 'class-validator';

export class CreatePatientDto {
  @IsNotEmpty({ message: 'El nombre de la mascota es obligatorio.' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  name!: string;

  @IsNotEmpty({ message: 'La especie de la mascota es obligatoria.' })
  @IsInt({ message: 'La especie proporcionada no es válida.' })
  speciesId!: number;

  @IsNotEmpty({ message: 'El sexo del paciente es obligatorio.' })
  @IsString({ message: 'El sexo debe ser un texto válido (MACHO, HEMBRA, INTERSEXUAL).' })
  sex!: string;

  @IsOptional()
  @IsInt({ message: 'La raza proporcionada no es válida.' })
  breedId?: number;

  @IsOptional()
  @IsInt({ message: 'El color proporcionado no es válido.' })
  colorId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD).' })
  birthDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El peso actual debe ser un valor numérico.' })
  currentWeight?: number;

  @IsOptional()
  @IsBoolean({ message: 'El estado de esterilización debe ser verdadero o falso.' })
  sterilized?: boolean;

  @IsOptional()
  @IsString({ message: 'El código del microchip debe ser un texto.' })
  microchipCode?: string;

  @IsOptional()
  @IsString({ message: 'Las marcas distintivas deben ser un texto.' })
  distinguishingMarks?: string;

  @IsOptional()
  @IsString({ message: 'Las alergias generales deben ser un texto.' })
  generalAllergies?: string;

  @IsOptional()
  @IsString({ message: 'El historial general general debe ser un texto.' })
  generalHistory?: string;

  @IsOptional()
  @IsInt({ message: 'El cliente asignado no es válido.' })
  clientId?: number;
}
