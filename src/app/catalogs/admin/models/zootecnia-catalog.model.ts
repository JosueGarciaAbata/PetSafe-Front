export type ZootecniaCatalogKind = 'ZOOTECNICAL_GROUP' | 'SPECIES' | 'BREED';

/* ─── Grupo Zootécnico ─── */

export interface ZootecnicalGroupItem {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  species?: { id: number; name: string }[];
}

export interface ZootecnicalGroupFormPayload {
  name: string;
  description?: string;
}

/* ─── Especie ─── */

export interface SpeciesItem {
  id: number;
  name: string;
  description: string | null;
  zootecnicalGroupId: number;
  zootecnicalGroup?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;
  breeds?: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SpeciesFormPayload {
  name: string;
  description?: string;
  zootecnicalGroupId: number;
}

/* ─── Raza ─── */

export interface BreedItem {
  id: number;
  name: string;
  description: string | null;
  speciesId?: number | null;
  species?: {
    id: number;
    name: string;
    zootecnicalGroupId?: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreedFormPayload {
  name: string;
  description?: string;
  speciesId: number;
}

/* ─── Paginated response (nestjs-paginate) ─── */

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
  links?: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  };
}
