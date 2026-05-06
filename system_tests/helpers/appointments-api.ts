/**
 * Helpers de API para setup/teardown de datos de prueba.
 * Usan el backend real directamente — NO pasan por la UI.
 */
import { APIRequestContext, Page } from '@playwright/test';

export const API_URL = process.env['TEST_API_URL'] ?? 'http://localhost:3000/api';

export function getTodayKey(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export async function getTokenFromPage(page: Page): Promise<string> {
  return (
    (await page.evaluate(() => localStorage.getItem('petsafe.auth.access-token'))) ?? ''
  );
}

export interface CreatedAppointment {
  id: number;
  patientName: string;
  patientId: number;
}

export async function createTestAppointment(
  request: APIRequestContext,
  token: string,
  patientId: number,
  overrides: Record<string, unknown> = {},
): Promise<CreatedAppointment> {
  const today = getTodayKey();
  const res = await request.post(`${API_URL}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId,
      scheduledDate: today,
      scheduledTime: '14:00',
      endTime: '14:30',
      reason: 'CONSULTA_GENERAL',
      notes: '[TEST SYSTEM] Generado automáticamente — se puede eliminar',
      ...overrides,
    },
  });

  if (!res.ok()) {
    throw new Error(
      `No se pudo crear la cita de prueba: ${res.status()} — ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { id: number; patientName: string | null; patientId: number };
  return {
    id: body.id,
    patientName: body.patientName?.trim() || `Paciente #${patientId}`,
    patientId: body.patientId,
  };
}

export async function cancelAppointment(
  request: APIRequestContext,
  token: string,
  appointmentId: number,
): Promise<void> {
  await request
    .patch(`${API_URL}/appointments/${appointmentId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
}
