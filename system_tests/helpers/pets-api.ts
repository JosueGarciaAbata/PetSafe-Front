/**
 * Helpers de API para mascotas (patients/pets).
 * Crean datos de prueba directamente contra el backend — NO pasan por la UI.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface CreatedPet {
  id: number;
  name: string;
  speciesId: number;
}

export function buildTestPetName(prefix = 'Mascota Test'): string {
  return `${prefix} ${Date.now()}`;
}

/**
 * Crea una mascota con tutor existente.
 * ownerId debe ser el ID de un cliente ya registrado.
 */
export async function createTestPet(
  request: APIRequestContext,
  token: string,
  ownerId: number,
  name = buildTestPetName(),
): Promise<CreatedPet> {
  const res = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      name,
      speciesId: '1',
      sex: 'MACHO',
      birthDate: '2023-06-01',
      currentWeight: '5.0',
      clientId: String(ownerId),
      generalHistory: '[TEST SYSTEM] Mascota temporal para pruebas de sistema',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear mascota: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; name: string; speciesId: number };
  return { id: body.id, name: body.name, speciesId: body.speciesId ?? 1 };
}

/**
 * Crea una mascota sin tutor (para flujos administrativos).
 */
export async function createTestPetWithoutOwner(
  request: APIRequestContext,
  token: string,
  name = buildTestPetName('Sin Tutor'),
): Promise<CreatedPet> {
  const res = await request.post(`${API_URL}/patients/admin/without-tutor`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      name,
      speciesId: '1',
      sex: 'HEMBRA',
      birthDate: '2023-01-15',
      currentWeight: '4.2',
      generalHistory: '[TEST SYSTEM] Sin tutor — temporal para pruebas',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear mascota sin tutor: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; name: string; speciesId: number };
  return { id: body.id, name: body.name, speciesId: body.speciesId ?? 1 };
}

/**
 * Crea una entrada de cola y luego inicia la atención para obtener un encounterId activo.
 */
export async function createActiveEncounter(
  request: APIRequestContext,
  token: string,
  patientId: number,
): Promise<number> {
  // 1. Crear entrada en cola
  const queueRes = await request.post(`${API_URL}/queue`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId,
      entryType: 'SIN_CITA',
      notes: '[TEST SYSTEM] Atención temporal para pruebas',
    },
  });
  if (!queueRes.ok()) {
    throw new Error(`No se pudo crear entrada de cola: ${queueRes.status()} — ${await queueRes.text()}`);
  }
  const queueBody = (await queueRes.json()) as { id: number };

  // 2. Iniciar atención
  const startRes = await request.patch(`${API_URL}/queue/${queueBody.id}/start`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!startRes.ok()) {
    throw new Error(`No se pudo iniciar atención: ${startRes.status()} — ${await startRes.text()}`);
  }

  // 3. Obtener el encounterId del response o consultar
  const startBody = (await startRes.json()) as { encounterId?: number };
  if (startBody.encounterId) return startBody.encounterId;

  // 4. Fallback: buscar en historial del paciente
  const histRes = await request.get(`${API_URL}/encounters?patientId=${patientId}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const histBody = (await histRes.json()) as { data: { id: number }[] };
  return histBody.data[0]?.id ?? 0;
}
