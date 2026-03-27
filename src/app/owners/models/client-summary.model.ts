import { PaginationMeta } from '@app/shared/pagination/pagination.model';

export interface ClientSummaryListApiResponse {
  data: ClientSummaryItemApiResponse[];
  meta: PaginationMeta;
}

export interface ClientSummaryItemApiResponse {
  id: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  email?: string | null;
  person: ClientSummaryPersonApiResponse;
  pets: ClientSummaryPetApiResponse[];
  petsCount: number;
}

export interface ClientSummaryPersonApiResponse {
  id: number;
  personType: string;
  firstName: string;
  lastName: string;
  identification?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  birthDate?: string | null;
}

export interface ClientSummaryPetApiResponse {
  id: number;
  name: string;
}

export interface ClientSummaryQuery {
  page: number;
  limit: number;
  searchTerm?: string;
}

export type ClientGenderLabel = 'Femenino' | 'Masculino' | 'Otro';

export interface ClientNameSource {
  person: {
    firstName: string;
    lastName: string;
    gender?: string | null;
  };
}

export function buildClientFullName(item: ClientNameSource): string {
  return `${item.person.firstName} ${item.person.lastName}`.trim();
}

export function buildClientInitials(item: ClientNameSource): string {
  const firstNameInitial = item.person.firstName.trim().charAt(0);
  const lastNameInitial = item.person.lastName.trim().charAt(0);
  return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
}

export function mapClientGenderLabel(value?: string | null): ClientGenderLabel {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'M':
    case 'MASCULINO':
      return 'Masculino';
    case 'OTRO':
    case 'OTRA':
      return 'Otro';
    case 'F':
    case 'FEMENINO':
    default:
      return 'Femenino';
  }
}

export function getVisibleClientPets(
  item: ClientSummaryItemApiResponse,
  maxVisiblePets = 2,
): ClientSummaryPetApiResponse[] {
  return item.pets.slice(0, maxVisiblePets);
}

export function getExtraClientPetsCount(
  item: ClientSummaryItemApiResponse,
  maxVisiblePets = 2,
): number {
  return Math.max(item.petsCount - Math.min(item.pets.length, maxVisiblePets), 0);
}
