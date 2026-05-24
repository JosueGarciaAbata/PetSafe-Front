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

/** Devuelve una fecha futura (hoy + offsetDays) en formato YYYY-MM-DD */
export function getFutureDateKey(offsetDays = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
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
  // Usa una fecha futura para evitar colisiones con citas de hoy del seed
  const futureDate = getFutureDateKey(30);
  // Hora aleatoria dentro de horario laboral para evitar solapamiento entre tests paralelos
  const hour = 8 + Math.floor(Math.random() * 8);
  const startTime = `${String(hour).padStart(2, '0')}:00`;
  const endTime   = `${String(hour).padStart(2, '0')}:30`;

  const res = await request.post(`${API_URL}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId,
      scheduledDate: futureDate,
      scheduledTime: startTime,
      endTime,
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
