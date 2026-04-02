import { Breed } from '../../domain/entities/catalogs/breed.entity.js';
import { BreedResponseDto } from '../../presentation/dto/breeds/breed-response.dto.js';

export class BreedMapper {
  static toResponseDto(breed: Breed): BreedResponseDto {
    return {
      id: breed.id,
      name: breed.name,
      description: breed.description ?? null,
      speciesId: breed.speciesId ?? null,
      species: breed.species
        ? {
            id: breed.species.id,
            name: breed.species.name,
            zootecnicalGroupId: breed.species.zootecnicalGroupId ?? null,
          }
        : null,
      createdAt: breed.createdAt,
      updatedAt: breed.updatedAt,
    };
  }
}
