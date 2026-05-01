import { APIRequestContext } from '@playwright/test';
import { API_URL } from './appointments-api';

export interface CreatedAdoptionPet {
  id: number;
  name: string;
}

export interface CreatedAdoption {
  id: number;
  patientId: number;
  patientName: string;
}

export function buildTestPetName(prefix = 'Adopcion Test'): string {
  return `${prefix} ${Date.now()}`;
}

export async function createAdoptionTestPet(
  request: APIRequestContext,
  token: string,
  name = buildTestPetName(),
): Promise<CreatedAdoptionPet> {
  const res = await request.post(`${API_URL}/patients/admin/without-tutor`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      name,
      speciesId: '1',
      sex: 'MACHO',
      birthDate: '2024-01-15',
      currentWeight: '8.4',
      generalHistory: '[TEST SYSTEM] Mascota temporal para pruebas de adopcion',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear mascota de adopcion: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; name: string };
  return {
    id: body.id,
    name: body.name,
  };
}

export async function createTestAdoption(
  request: APIRequestContext,
  token: string,
): Promise<CreatedAdoption> {
  const pet = await createAdoptionTestPet(request, token, buildTestPetName('Vista Adopcion'));
  const res = await request.post(`${API_URL}/adoptions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId: pet.id,
      contactPhone: '0998887766',
      contactName: 'Equipo PetSafe',
      contactEmail: 'adopciones@petsafe.com',
      story: '[TEST SYSTEM] Historia para prueba de vista de adopcion',
      requirements: 'Seguimiento veterinario y hogar responsable',
      notes: '[TEST SYSTEM] Registro temporal para pruebas',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear adopcion de prueba: ${res.status()} — ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; patientId: number };
  return {
    id: body.id,
    patientId: body.patientId,
    patientName: pet.name,
  };
}
