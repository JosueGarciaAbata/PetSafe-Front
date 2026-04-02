import { Species } from '../../domain/entities/catalogs/species.entity.js';
import { SpeciesResponseDto } from '../../presentation/dto/species/species-response.dto.js';

export class SpeciesMapper {
  static toResponseDto(species: Species): SpeciesResponseDto {
    return {
      id: species.id,
      zootecnicalGroupId: species.zootecnicalGroupId,
      zootecnicalGroup: species.zootecnicalGroup
        ? {
            id: species.zootecnicalGroup.id,
            name: species.zootecnicalGroup.name,
            description: species.zootecnicalGroup.description ?? null,
          }
        : null,
      name: species.name,
      description: species.description ?? null,
      createdAt: species.createdAt,
      updatedAt: species.updatedAt,
      breeds: species.breeds?.map((r) => ({
        id: r.id,
        name: r.name,
      })) ?? [],
    };
  }
}
