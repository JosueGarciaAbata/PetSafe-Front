export class ZootecnicalGroupResponseDto {
  id!: number;
  name!: string;
  description?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  species?: Array<{ id: number; name: string }>;
}
