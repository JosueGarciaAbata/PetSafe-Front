import { PartialType } from '@nestjs/mapped-types';
import { CreateProcedureCatalogDto } from './create-procedure-catalog.dto.js';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateProcedureCatalogDto extends PartialType(CreateProcedureCatalogDto) {
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser booleano.' })
  isActive?: boolean;
}
