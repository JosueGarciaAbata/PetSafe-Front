export class PatientImageResponseDto {
  id!: number;
  url!: string;
  originalName!: string;
  mimeType!: string | null;
  sizeBytes!: number | null;
  width!: number | null;
  height!: number | null;
  storageKey!: string | null;
  provider!: string;
}
