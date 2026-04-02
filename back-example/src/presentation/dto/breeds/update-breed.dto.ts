import { PartialType } from '@nestjs/mapped-types';
import { CreateBreedDto } from './create-breed.dto.js';

export class UpdateBreedDto extends PartialType(CreateBreedDto) {}
