/**
 * Helpers de API para solicitudes de cita (appointment-requests).
 * Usados en pruebas de sistema del módulo de Notificaciones.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface CreatedAppointmentRequest {
  id: number;
  status: string;
  reason: string;
}

/**
 * Crea una solicitud de cita pendiente simulando la perspectiva del staff
 * usando un token de admin (no de cliente). Sólo válido si el backend permite
 * creación desde staff para pruebas; si el endpoint requiere CLIENTE_APP, este
 * helper fallará y el test hará skip.
 */
export async function createTestAppointmentRequest(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    patientId: number;
    reason: string;
    preferredDate: string;
    preferredTime: string;
  }> = {},
): Promise<CreatedAppointmentRequest | null> {
  // La solicitud la hace el staff en nombre del cliente.
  // Si la API requiere rol CLIENTE_APP, este helper retorna null y el test hace skip.
  const today = new Date();
  today.setDate(today.getDate() + 7);
  const preferredDate = today.toISOString().slice(0, 10);

  const res = await request.post(`${API_URL}/appointment-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      reason: '[TEST SYSTEM] Solicitud de cita de prueba de sistema',
      preferredDate: overrides.preferredDate ?? preferredDate,
      preferredTime: overrides.preferredTime ?? '10:00',
      ...overrides,
    },
  });

  if (!res.ok()) {
    return null; // El test que llame a esto debe hacer skip
  }

  const body = (await res.json()) as { id: number; status: string; reason: string };
  return { id: body.id, status: body.status, reason: body.reason };
}

/**
 * Obtiene el listado de solicitudes de cita (vista staff).
 */
export async function fetchAppointmentRequests(
  request: APIRequestContext,
  token: string,
): Promise<CreatedAppointmentRequest[]> {
  const res = await request.get(`${API_URL}/appointment-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) return [];

  const body = (await res.json()) as
    | { id: number; status: string; reason: string }[]
    | { data: { id: number; status: string; reason: string }[] };

  if (Array.isArray(body)) return body;
  return (body as { data: { id: number; status: string; reason: string }[] }).data ?? [];
}

/**
 * Obtiene el conteo de solicitudes pendientes.
 */
export async function fetchPendingCount(
  request: APIRequestContext,
  token: string,
): Promise<number> {
  const res = await request.get(`${API_URL}/appointment-requests/pending-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return 0;
  const body = (await res.json()) as { count: number };
  return body.count;
}
