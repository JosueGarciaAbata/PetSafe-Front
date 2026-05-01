import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface TestUserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function updateTestUserProfile(
  request: APIRequestContext,
  token: string,
  profile: TestUserProfile,
): Promise<void> {
  const res = await request.patch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data: profile,
  });

  if (!res.ok()) {
    throw new Error(`No se pudo restaurar el perfil de pruebas: ${res.status()} — ${await res.text()}`);
  }
}
