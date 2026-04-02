export class BreedResponseDto {
  id!: number;
  name!: string;
  description?: string | null;
  speciesId?: number | null;
  species?: {
    id: number;
    name: string;
    zootecnicalGroupId?: number | null;
  } | null;
  createdAt!: Date;
  updatedAt!: Date;
}
