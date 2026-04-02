import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { AppetiteStatusEnum, WaterIntakeStatusEnum } from '../../../domain/enums/index.js';

export class UpsertAnamnesisDto {
  @IsOptional()
  @IsString({ message: 'El inicio del problema debe ser texto.' })
  problemStartText?: string;

  @IsOptional()
  @IsString({ message: 'Las cirugías previas deben ser texto.' })
  previousSurgeriesText?: string;

  @IsOptional()
  @IsString({ message: 'Cómo inició el problema debe ser texto.' })
  howProblemStartedText?: string;

  @IsOptional()
  @IsBoolean({ message: 'Indica si las vacunas están al día: true o false.' })
  vaccinesUpToDate?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Indica si la desparasitación está al día: true o false.' })
  dewormingUpToDate?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Indica si tiene otra mascota en casa: true o false.' })
  hasPetAtHome?: boolean;

  @IsOptional()
  @IsString({ message: 'El detalle de la mascota en casa debe ser texto.' })
  petAtHomeDetail?: string;

  @IsOptional()
  @IsString({ message: 'La medicación administrada debe ser texto.' })
  administeredMedicationText?: string;

  /**
   * Valores válidos: NORMAL | DISMINUIDO | AUMENTADO | ANOREXIA
   */
  @IsOptional()
  @IsEnum(AppetiteStatusEnum, {
    message: `El estado del apetito no es válido. Valores aceptados: ${Object.values(AppetiteStatusEnum).join(', ')}`,
  })
  appetiteStatus?: AppetiteStatusEnum;

  /**
   * Valores válidos: NORMAL | DISMINUIDO | AUMENTADO
   */
  @IsOptional()
  @IsEnum(WaterIntakeStatusEnum, {
    message: `El consumo de agua no es válido. Valores aceptados: ${Object.values(WaterIntakeStatusEnum).join(', ')}`,
  })
  waterIntakeStatus?: WaterIntakeStatusEnum;

  @IsOptional()
  @IsString({ message: 'La descripción de heces debe ser texto.' })
  fecesText?: string;

  @IsOptional()
  @IsString({ message: 'La descripción de vómito debe ser texto.' })
  vomitText?: string;

  @IsOptional()
  @IsInt({ message: 'El número de deposiciones debe ser un entero.' })
  @Min(0, { message: 'El número de deposiciones no puede ser negativo.' })
  numberOfBowelMovements?: number;

  @IsOptional()
  @IsString({ message: 'La descripción de orina debe ser texto.' })
  urineText?: string;

  @IsOptional()
  @IsString({ message: 'Los problemas respiratorios deben ser texto.' })
  respiratoryProblemsText?: string;

  @IsOptional()
  @IsString({ message: 'La dificultad al caminar debe ser texto.' })
  difficultyWalkingText?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto.' })
  notes?: string;
}
