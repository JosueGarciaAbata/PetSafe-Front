import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { ClientDataDto } from './client-data.dto.js';

export class UpdateClientDto extends PartialType(ClientDataDto) {
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  active?: boolean;
}
