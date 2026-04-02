import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreatePatientVaccineRecordDto {
  @IsNotEmpty({ message: 'El ID de la vacuna es obligatorio.' })
  @IsInt({ message: 'El ID de la vacuna debe ser un entero.' })
  vaccineId!: number;

  @IsNotEmpty({ message: 'La fecha de aplicación es obligatoria.' })
  @IsDateString({}, { message: 'applicationDate debe ser una fecha válida (YYYY-MM-DD).' })
  applicationDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  administeredBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  administeredAt?: string;

  /** true = vacuna fue aplicada fuera de esta clínica */
  @IsOptional()
  @IsBoolean({ message: 'isExternal debe ser verdadero o falso.' })
  isExternal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'nextDoseDate debe ser una fecha válida (YYYY-MM-DD).' })
  nextDoseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Si fue aplicada en un encounter interno de esta clínica */
  @IsOptional()
  @IsInt({ message: 'encounterId debe ser un entero.' })
  encounterId?: number;
}
