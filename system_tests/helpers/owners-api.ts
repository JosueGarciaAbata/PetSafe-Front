/**
 * Helpers de API para owners (clientes/tutores).
 * Crean datos de prueba directamente contra el backend — NO pasan por la UI.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface CreatedOwner {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  documentId: string;
  email: string;
}

/** Genera un email único para evitar colisiones en pruebas paralelas */
export function buildTestEmail(prefix = 'test'): string {
  return `${prefix}.${Date.now()}@playwright-test.com`;
}

export function buildTestDocumentId(): string {
  const province = '17';
  const thirdDigit = '1';
  let sequence = '';
  for (let i = 0; i < 6; i++) {
    sequence += Math.floor(Math.random() * 10).toString();
  }
  const base = province + thirdDigit + sequence;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(base.charAt(i), 10);
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }
  const digit = (10 - (sum % 10)) % 10;
  return base + digit.toString();
}

export async function createTestOwner(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone: string;
  }> = {},
): Promise<CreatedOwner> {
  const documentId = overrides.documentId ?? buildTestDocumentId();
  const email = overrides.email ?? buildTestEmail('owner');

  const res = await request.post(`${API_URL}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      firstName: 'Tutor',
      lastName: 'Playwright Test',
      documentId,
      phone: '0991234567',
      gender: 'M',
      birthDate: '1990-05-01',
      address: 'Av. de Prueba 123, Quito',
      ...overrides,
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear owner: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as {
    id: number;
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
  };

  return {
    id: body.id,
    firstName: body.firstName,
    lastName: body.lastName,
    fullName: `${body.firstName} ${body.lastName}`,
    documentId: body.documentId,
    email: body.email,
  };
}

export async function deleteTestOwner(
  request: APIRequestContext,
  token: string,
  ownerId: number,
): Promise<void> {
  await request
    .delete(`${API_URL}/clients/${ownerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
}
