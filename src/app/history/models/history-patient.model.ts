export type HistoryPatient = {
  id: number;
  name: string;
  species: { id: number; name: string } | null;
  breed: { id: number; name: string } | null;
  tutorName: string | null;
  tutorContact: string | null;
  birthDate: string | null;
  ageYears: number | null;
  sex: string;
  currentWeight: number | null;
  image: { url: string } | null;
};

export type HistoryPatientListResponse = {
  data: HistoryPatient[];
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

export type HistoryPatientListQuery = {
  page: number;
  limit: number;
  search?: string;
};
