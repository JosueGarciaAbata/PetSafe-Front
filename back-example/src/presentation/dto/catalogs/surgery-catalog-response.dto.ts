import { SurgeryCatalog } from '../../../domain/entities/catalogs/surgery-catalog.entity.js';

export class SurgeryCatalogResponseDto {
  id: number;
  name: string;
  description: string | null;
  requiresAnesthesia: boolean;
  isActive: boolean;

  constructor(entity: SurgeryCatalog) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.requiresAnesthesia = entity.requiresAnesthesia;
    this.isActive = entity.isActive;
  }
}
