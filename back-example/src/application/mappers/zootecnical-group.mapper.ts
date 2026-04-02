import { ZootecnicalGroup } from '../../domain/entities/catalogs/zootecnical-group.entity.js';
import { ZootecnicalGroupResponseDto } from '../../presentation/dto/zootecnical-groups/zootecnical-group-response.dto.js';

export class ZootecnicalGroupMapper {
  static toResponseDto(group: ZootecnicalGroup): ZootecnicalGroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      description: group.description ?? null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      species: group.species?.map((item) => ({
        id: item.id,
        name: item.name,
      })) ?? [],
    };
  }
}
