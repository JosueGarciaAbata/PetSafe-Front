import { PersonResponseDto } from '../users/user-response.dto.js';

export class ClientResponseDto {
  id!: number;
  active!: boolean;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  email?: string | null;
  person!: PersonResponseDto;
}

export class PaginatedClientsResponseDto {
  data!: ClientResponseDto[];
  meta!: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
