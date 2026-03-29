export interface ClientTutorBasicApiResponse {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface ClientTutorBasicQuery {
  page?: number;
  limit: number;
  search?: string;
}
