import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';
import { Repository } from 'typeorm';

import { ZootecnicalGroup } from '../../../domain/entities/catalogs/zootecnical-group.entity.js';
import { Species } from '../../../domain/entities/catalogs/species.entity.js';
import { CreateZootecnicalGroupDto } from '../../../presentation/dto/zootecnical-groups/create-zootecnical-group.dto.js';
import { UpdateZootecnicalGroupDto } from '../../../presentation/dto/zootecnical-groups/update-zootecnical-group.dto.js';
import { ZootecnicalGroupResponseDto } from '../../../presentation/dto/zootecnical-groups/zootecnical-group-response.dto.js';
import { ZootecnicalGroupMapper } from '../../mappers/zootecnical-group.mapper.js';

const PAGINATE_CONFIG: PaginateConfig<ZootecnicalGroup> = {
  sortableColumns: ['id', 'name', 'createdAt'],
  defaultSortBy: [['name', 'ASC']],
  searchableColumns: ['name'],
  relations: ['species'],
  maxLimit: 50,
  defaultLimit: 20,
};

@Injectable()
export class ZootecnicalGroupsService {
  constructor(
    @InjectRepository(ZootecnicalGroup)
    private readonly repo: Repository<ZootecnicalGroup>,
    @InjectRepository(Species)
    private readonly speciesRepo: Repository<Species>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    const result = await paginate(query, this.repo, PAGINATE_CONFIG);
    return {
      ...result,
      data: result.data.map(ZootecnicalGroupMapper.toResponseDto),
    };
  }

  async findOne(id: number): Promise<ZootecnicalGroupResponseDto> {
    const group = await this.repo.findOne({
      where: { id },
      relations: ['species'],
    });
    if (!group) throw new NotFoundException('Grupo zootécnico no encontrado');
    return ZootecnicalGroupMapper.toResponseDto(group);
  }

  async create(dto: CreateZootecnicalGroupDto): Promise<ZootecnicalGroupResponseDto> {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('El grupo zootécnico ya existe');

    const entity = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.repo.save(entity);
    return ZootecnicalGroupMapper.toResponseDto(saved);
  }

  async update(id: number, dto: UpdateZootecnicalGroupDto): Promise<ZootecnicalGroupResponseDto> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Grupo zootécnico no encontrado');

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description ?? null;

    const saved = await this.repo.save(group);
    return ZootecnicalGroupMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Grupo zootécnico no encontrado');

    const activeSpeciesCount = await this.speciesRepo.count({
      where: {
        zootecnicalGroupId: id,
      },
    });
    if (activeSpeciesCount > 0) {
      throw new ConflictException(
        'No se puede eliminar el grupo zootécnico porque tiene especies activas asociadas',
      );
    }

    await this.repo.softDelete(id);
    return { message: 'Grupo zootécnico eliminado correctamente' };
  }
}
