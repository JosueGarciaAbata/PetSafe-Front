import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from './client-response.dto.js';

export type PaginatedClientSummaryResponse = {
  data: ClientSummaryItem[];
  meta: PaginatedClientsResponseDto['meta'];
};


export type ClientSummaryItem = ClientResponseDto & {
  pets: ClientPetSummary[];
  petsCount: number;
};

export type ClientPetSummary = {
  id: number;
  name: string;
};

export type PaginatedBasicTutorsResponse = {
  data: BasicTutorResponse[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type BasicTutorResponse = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
};