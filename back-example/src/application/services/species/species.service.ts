import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, type PaginateQuery, type PaginateConfig, type Paginated } from 'nestjs-paginate';

import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { ZootecnicalGroup } from '../../../domain/entities/catalogs/zootecnical-group.entity.js';
import { Breed } from '../../../domain/entities/catalogs/breed.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { Vaccine } from '../../../domain/entities/catalogs/vaccine.entity.js';
import { CreateSpeciesDto } from '../../../presentation/dto/species/create-species.dto.js';
import { UpdateSpeciesDto } from '../../../presentation/dto/species/update-species.dto.js';
import { SpeciesMapper } from '../../mappers/species.mapper.js';
import { SpeciesResponseDto } from '../../../presentation/dto/species/species-response.dto.js';

const PAGINATE_CONFIG: PaginateConfig<Species> = {
  sortableColumns: ['id', 'name', 'createdAt'],
  defaultSortBy: [['name', 'ASC']],
  searchableColumns: ['name'],
  relations: ['zootecnicalGroup', 'breeds'],
  maxLimit: 50,
  defaultLimit: 20,
};

@Injectable()
export class SpeciesService {
  constructor(
    @InjectRepository(Species)
    private readonly repo: Repository<Species>,
    @InjectRepository(ZootecnicalGroup)
    private readonly zootecnicalGroupRepo: Repository<ZootecnicalGroup>,
    @InjectRepository(Breed)
    private readonly breedRepo: Repository<Breed>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Vaccine)
    private readonly vaccineRepo: Repository<Vaccine>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    const result = await paginate(query, this.repo, PAGINATE_CONFIG);
    return {
      ...result,
      data: result.data.map(SpeciesMapper.toResponseDto),
    };
  }

  async findOne(id: number): Promise<SpeciesResponseDto> {
    const species = await this.repo.findOne({
      where: { id },
      relations: ['breeds', 'zootecnicalGroup'],
    });
    if (!species) throw new NotFoundException('Especie no encontrada');
    return SpeciesMapper.toResponseDto(species);
  }

  async create(dto: CreateSpeciesDto): Promise<SpeciesResponseDto> {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('La especie ya existe');

    const zootecnicalGroup = await this.zootecnicalGroupRepo.findOne({
      where: { id: dto.zootecnicalGroupId },
    });
    if (!zootecnicalGroup) throw new NotFoundException('Grupo zootécnico no encontrado');

    const entity = this.repo.create({
      zootecnicalGroupId: dto.zootecnicalGroupId,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateSpeciesDto): Promise<SpeciesResponseDto> {
    const species = await this.repo.findOne({ where: { id } });
    if (!species) throw new NotFoundException('Especie no encontrada');

    if (dto.name !== undefined && dto.name !== species.name) {
      const exists = await this.repo.findOne({ where: { name: dto.name } });
      if (exists && exists.id !== id) throw new ConflictException('La especie ya existe');
      species.name = dto.name;
    }
    if (dto.zootecnicalGroupId !== undefined) {
      const zootecnicalGroup = await this.zootecnicalGroupRepo.findOne({
        where: { id: dto.zootecnicalGroupId },
      });
      if (!zootecnicalGroup) throw new NotFoundException('Grupo zootécnico no encontrado');
      species.zootecnicalGroupId = dto.zootecnicalGroupId;
    }
    if (dto.description !== undefined) species.description = dto.description ?? null;

    const saved = await this.repo.save(species);
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const species = await this.repo.findOne({ where: { id } });
    if (!species) throw new NotFoundException('Especie no encontrada');

    const [activeBreedsCount, activePatientsCount, activeVaccinesCount] = await Promise.all([
      this.breedRepo.count({ where: { speciesId: id } }),
      this.patientRepo.count({ where: { speciesId: id } }),
      this.vaccineRepo.count({ where: { speciesId: id } }),
    ]);

    if (activeBreedsCount > 0 || activePatientsCount > 0 || activeVaccinesCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la especie porque tiene registros activos asociados',
      );
    }

    await this.repo.softDelete(id);
    return { message: 'Especie eliminada correctamente' };
  }
}
