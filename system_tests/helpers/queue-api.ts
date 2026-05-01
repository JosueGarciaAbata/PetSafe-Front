import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface CreatedQueueEntry {
  id: number;
  patientName: string;
  patientId: number;
}

export async function createTestQueueEntry(
  request: APIRequestContext,
  token: string,
  patientId: number,
): Promise<CreatedQueueEntry> {
  const res = await request.post(`${API_URL}/queue`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId,
      entryType: 'SIN_CITA',
      notes: '[TEST SYSTEM] Generado automáticamente — se puede eliminar',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear entrada de cola: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as {
    id: number;
    patient: { id: number; name: string } | null;
  };

  return {
    id: body.id,
    patientId,
    patientName: body.patient?.name ?? `Paciente #${patientId}`,
  };
}

export async function cancelQueueEntry(
  request: APIRequestContext,
  token: string,
  entryId: number,
): Promise<void> {
  await request
    .patch(`${API_URL}/queue/${entryId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
}
