export interface UserProfilePersonApiResponse {
  id: number;
  personType?: string | null;
  firstName: string;
  lastName: string;
}

export interface UserProfileApiResponse {
  id: number;
  email: string;
  lastLoginAt: string | null;
  roles: readonly string[];
  person: UserProfilePersonApiResponse;
  employeeId: number | null;
  isVeterinarian: boolean;
}

export interface VeterinarianSummaryApiResponse {
  id: number;
  personId: number;
  fullName: string;
  documentId: string | null;
  code: string | null;
  professionalRegistration: string | null;
}
