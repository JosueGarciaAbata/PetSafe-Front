import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateColorDto {
  @IsNotEmpty({ message: 'El nombre del color es obligatorio.' })
  @IsString({ message: 'El nombre debe ser texto.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'El código hexadecimal debe ser texto.' })
  hexCode?: string;
}
