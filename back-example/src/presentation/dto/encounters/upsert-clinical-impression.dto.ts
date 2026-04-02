import { IsOptional, IsString } from 'class-validator';

export class UpsertClinicalImpressionDto {
  @IsOptional()
  @IsString()
  presumptiveDiagnosis?: string;

  @IsOptional()
  @IsString()
  differentialDiagnosis?: string;

  @IsOptional()
  @IsString()
  prognosis?: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}
