import { environment } from '@env/environment';

export const API_BASE_URL = environment.apiUrl;

export function buildApiUrl(path: string): string {
  return new URL(path, API_BASE_URL).toString();
}