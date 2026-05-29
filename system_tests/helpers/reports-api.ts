/**
 * Helpers de API para reportes (reports).
 * Verifican directamente que los endpoints de PDF responden con application/pdf.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

/**
 * Descarga el PDF del historial clínico de un paciente vía API directa.
 * Retorna el buffer del PDF o null si falla.
 */
export async function downloadClinicalHistoryPdf(
  request: APIRequestContext,
  token: string,
  patientId: number,
): Promise<{ ok: boolean; contentType: string; size: number }> {
  const res = await request.get(
    `${API_URL}/reports/patients/${patientId}/clinical-history/pdf`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    ok: res.ok(),
    contentType: res.headers()['content-type'] ?? '',
    size: (await res.body()).length,
  };
}

/**
 * Descarga el PDF de la agenda de citas para un rango de fechas.
 */
export async function downloadAppointmentsPdf(
  request: APIRequestContext,
  token: string,
  from: string,
  to: string,
): Promise<{ ok: boolean; contentType: string; size: number }> {
  const res = await request.get(
    `${API_URL}/reports/schedule/pdf?from=${from}&to=${to}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    ok: res.ok(),
    contentType: res.headers()['content-type'] ?? '',
    size: (await res.body()).length,
  };
}

/**
 * Obtiene la agenda operativa JSON para un rango de fechas.
 */
export async function fetchScheduleReport(
  request: APIRequestContext,
  token: string,
  from: string,
  to: string,
): Promise<unknown[]> {
  const res = await request.get(
    `${API_URL}/reports/schedule?from=${from}&to=${to}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok()) return [];
  return (await res.json()) as unknown[];
}
