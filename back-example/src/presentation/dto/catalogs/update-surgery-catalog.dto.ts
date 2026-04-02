import { PartialType } from '@nestjs/mapped-types';
import { CreateSurgeryCatalogDto } from './create-surgery-catalog.dto.js';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateSurgeryCatalogDto extends PartialType(CreateSurgeryCatalogDto) {
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser booleano.' })
  isActive?: boolean;
}
