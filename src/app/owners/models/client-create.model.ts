export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  gender?: ClientGenderCode;
  birthDate?: string;
  notes?: string;
  user?: CreateClientUserRequest;
}

export interface CreateClientUserRequest {
  email: string;
}

export interface CreateClientFormValue {
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  address: string;
  gender: ClientGenderCode;
  birthDate: string;
  notes: string;
  email: string;
}

export type ClientGenderCode = 'F' | 'M' | 'OTRO';
