import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, type PaginateQuery, type PaginateConfig, type Paginated } from 'nestjs-paginate';

import { Breed } from '../../../domain/entities/catalogs/breed.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { CreateBreedDto } from '../../../presentation/dto/breeds/create-breed.dto.js';
import { UpdateBreedDto } from '../../../presentation/dto/breeds/update-breed.dto.js';
import { BreedMapper } from '../../mappers/breed.mapper.js';
import { BreedResponseDto } from '../../../presentation/dto/breeds/breed-response.dto.js';

const PAGINATE_CONFIG: PaginateConfig<Breed> = {
  sortableColumns: ['id', 'name', 'createdAt'],
  defaultSortBy: [['name', 'ASC']],
  searchableColumns: ['name'],
  relations: ['species', 'species.zootecnicalGroup'],
  maxLimit: 50,
  defaultLimit: 20,
};

@Injectable()
export class BreedsService {
  constructor(
    @InjectRepository(Breed)
    private readonly repo: Repository<Breed>,
    @InjectRepository(Species)
    private readonly speciesRepo: Repository<Species>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) { }

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    const result = await paginate(query, this.repo, PAGINATE_CONFIG);
    return {
      ...result,
      data: result.data.map(BreedMapper.toResponseDto),
    };
  }

  async findOne(id: number): Promise<BreedResponseDto> {
    const breed = await this.repo.findOne({
      where: { id },
      relations: ['species', 'species.zootecnicalGroup'],
    });
    if (!breed) throw new NotFoundException('Raza no encontrada');
    return BreedMapper.toResponseDto(breed);
  }

  async create(dto: CreateBreedDto): Promise<BreedResponseDto> {
    const exists = await this.repo.findOne({ where: { name: dto.name, speciesId: dto.speciesId } });
    if (exists) throw new ConflictException('La raza ya existe para esta especie');

    const species = await this.speciesRepo.findOne({ where: { id: dto.speciesId } });
    if (!species) throw new NotFoundException('Especie no encontrada');

    const entity = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      speciesId: dto.speciesId,
    });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateBreedDto): Promise<BreedResponseDto> {
    const breed = await this.repo.findOne({ where: { id } });
    if (!breed) throw new NotFoundException('Raza no encontrada');

    const targetSpeciesId = dto.speciesId ?? breed.speciesId;
    const targetName = dto.name ?? breed.name;

    if (dto.speciesId !== undefined) {
      const species = await this.speciesRepo.findOne({ where: { id: targetSpeciesId } });
      if (!species) throw new NotFoundException('Especie no encontrada');
    }
    const duplicate = await this.repo.findOne({
      where: { name: targetName, speciesId: targetSpeciesId },
    });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException('La raza ya existe para esta especie');
    }

    if (dto.name !== undefined) breed.name = dto.name;
    if (dto.description !== undefined) breed.description = dto.description ?? null;
    if (dto.speciesId !== undefined) breed.speciesId = dto.speciesId;

    const saved = await this.repo.save(breed);
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const breed = await this.repo.findOne({ where: { id } });
    if (!breed) throw new NotFoundException('Raza no encontrada');

    const activePatientsCount = await this.patientRepo.count({
      where: { breedId: id },
    });
    if (activePatientsCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la raza porque tiene mascotas activas asociadas',
      );
    }

    await this.repo.softDelete(id);
    return { message: 'Raza eliminada correctamente' };
  }
}
