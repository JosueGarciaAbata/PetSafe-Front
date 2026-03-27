export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  gender?: ClientGenderCode;
  birthDate?: string;
  notes?: string;
}

export type ClientGenderCode = 'F' | 'M' | 'OTRO';
