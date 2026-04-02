import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class UpsertPlanDto {
  @IsOptional()
  @IsString({ message: 'El plan clínico debe ser texto.' })
  clinicalPlan?: string;

  @IsOptional()
  @IsBoolean({ message: 'Indica si se requiere seguimiento: true o false.' })
  requiresFollowUp?: boolean;

  @ValidateIf((o: UpsertPlanDto) => o.requiresFollowUp === true)
  @IsNotEmpty({ message: 'Si marcas que se requiere seguimiento, debes indicar la fecha sugerida.' })
  @IsDateString({}, { message: 'La fecha de seguimiento debe estar en formato válido (ej. 2027-03-29).' })
  suggestedFollowUpDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas del plan deben ser texto.' })
  planNotes?: string;
}
