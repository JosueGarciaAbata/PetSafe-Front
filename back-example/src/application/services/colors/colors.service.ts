import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, type PaginateQuery, type PaginateConfig, type Paginated } from 'nestjs-paginate';

import { Color } from '../../../domain/entities/catalogs/color.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { CreateColorDto } from '../../../presentation/dto/colors/create-color.dto.js';
import { UpdateColorDto } from '../../../presentation/dto/colors/update-color.dto.js';
import { ColorMapper } from '../../mappers/color.mapper.js';
import { ColorResponseDto } from '../../../presentation/dto/colors/color-response.dto.js';

const PAGINATE_CONFIG: PaginateConfig<Color> = {
  sortableColumns: ['id', 'name', 'createdAt'],
  defaultSortBy: [['name', 'ASC']],
  searchableColumns: ['name'],
  maxLimit: 50,
  defaultLimit: 20,
};

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private readonly repo: Repository<Color>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    const result = await paginate(query, this.repo, PAGINATE_CONFIG);
    return {
      ...result,
      data: result.data.map(ColorMapper.toResponseDto),
    };
  }

  async findOne(id: number): Promise<ColorResponseDto> {
    const color = await this.repo.findOne({ where: { id } });
    if (!color) throw new NotFoundException('Color no encontrado');
    return ColorMapper.toResponseDto(color);
  }

  async create(dto: CreateColorDto): Promise<ColorResponseDto> {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('El color ya existe');

    const entity = this.repo.create({
      name: dto.name,
    });
    const saved = await this.repo.save(entity);
    return ColorMapper.toResponseDto(saved);
  }

  async update(id: number, dto: UpdateColorDto): Promise<ColorResponseDto> {
    const color = await this.repo.findOne({ where: { id } });
    if (!color) throw new NotFoundException('Color no encontrado');

    if (dto.name !== undefined) color.name = dto.name;

    const saved = await this.repo.save(color);
    return ColorMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const color = await this.repo.findOne({ where: { id } });
    if (!color) throw new NotFoundException('Color no encontrado');

    const activePatientsCount = await this.patientRepo.count({
      where: { colorId: id },
    });
    if (activePatientsCount > 0) {
      throw new ConflictException(
        'No se puede eliminar el color porque tiene mascotas activas asociadas',
      );
    }

    await this.repo.softDelete(id);
    return { message: 'Color eliminado correctamente' };
  }
}
