import { IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateVaccineMandatoryDto {
  @IsBoolean({ message: 'isMandatory debe ser verdadero o falso.' })
  isMandatory!: boolean;

  @IsOptional()
  @IsInt({ message: 'doseOrder debe ser un entero.' })
  @Min(1, { message: 'doseOrder debe ser al menos 1.' })
  doseOrder?: number | null;
}
