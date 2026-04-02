import { PartialType } from '@nestjs/mapped-types';
import { CreateZootecnicalGroupDto } from './create-zootecnical-group.dto.js';

export class UpdateZootecnicalGroupDto extends PartialType(CreateZootecnicalGroupDto) {}
