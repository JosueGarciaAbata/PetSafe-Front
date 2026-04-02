import { Color } from '../../domain/entities/catalogs/color.entity.js';
import { ColorResponseDto } from '../../presentation/dto/colors/color-response.dto.js';

export class ColorMapper {
  static toResponseDto(color: Color): ColorResponseDto {
    return {
      id: color.id,
      name: color.name,
      hexCode: (color as any).hexCode ?? null,
      createdAt: color.createdAt,
      updatedAt: color.updatedAt,
    };
  }
}
