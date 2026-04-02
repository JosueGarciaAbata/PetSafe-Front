import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientAccessDto } from './client-access.dto.js';
import { ClientDataDto } from './client-data.dto.js';

export class CreateClientDto extends ClientDataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientAccessDto)
  user?: ClientAccessDto;
}
