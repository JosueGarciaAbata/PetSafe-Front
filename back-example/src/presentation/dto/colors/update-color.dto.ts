import { PartialType } from '@nestjs/mapped-types';
import { CreateColorDto } from './create-color.dto.js';

export class UpdateColorDto extends PartialType(CreateColorDto) {}
