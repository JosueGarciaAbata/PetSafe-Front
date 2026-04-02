export interface PetImageApiResponse {
  id: number;
  url: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  storageKey: string | null;
  provider: string;
}

export interface PetImageUploadValue {
  file: File;
  previewUrl: string;
}
