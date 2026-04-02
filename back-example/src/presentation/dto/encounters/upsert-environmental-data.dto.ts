import { IsOptional, IsString } from 'class-validator';

export class UpsertEnvironmentalDataDto {
  @IsOptional()
  @IsString()
  environmentNotes?: string;

  @IsOptional()
  @IsString()
  nutritionNotes?: string;

  @IsOptional()
  @IsString()
  lifestyleNotes?: string;

  @IsOptional()
  @IsString()
  feedingTypeNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
