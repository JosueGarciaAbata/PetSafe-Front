import { ProcedureCatalog } from '../../../domain/entities/catalogs/procedure-catalog.entity.js';

export class ProcedureCatalogResponseDto {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;

  constructor(entity: ProcedureCatalog) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.isActive = entity.isActive;
  }
}
