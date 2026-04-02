export class SpeciesResponseDto {
  id!: number;
  zootecnicalGroupId!: number;
  zootecnicalGroup?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;
  name!: string;
  description?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  breeds?: Array<{ id: number; name: string }>;
}
