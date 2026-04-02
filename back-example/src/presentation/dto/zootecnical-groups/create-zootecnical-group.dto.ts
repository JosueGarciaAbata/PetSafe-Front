import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateZootecnicalGroupDto {
  @IsNotEmpty({ message: 'El nombre del grupo zootécnico es obligatorio.' })
  @IsString({ message: 'El nombre del grupo zootécnico debe ser texto.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;
}
