import { APIRequestContext } from '@playwright/test';
import { API_URL, getTodayKey } from './appointments-api';

let documentCounter = 0;

export interface CreatedOwner {
  id: number;
  fullName: string;
  documentId: string;
  email: string;
}

export interface CreatedPet {
  id: number;
  name: string;
}

export interface CreatedTreatment {
  id: number;
  encounterId: number;
  patientName: string;
  instructions: string;
}

export function buildUniqueName(prefix: string): string {
  return `${prefix} ${Date.now()} ${documentCounter++}`;
}

function buildAlphaSuffix(value: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let remaining = Math.abs(value);
  let suffix = '';

  do {
    suffix = alphabet[remaining % alphabet.length] + suffix;
    remaining = Math.floor(remaining / alphabet.length);
  } while (remaining > 0);

  return suffix;
}

export function buildValidCedula(): string {
  const seed = `${Date.now()}${documentCounter++}`.slice(-6).padStart(6, '0');
  const base = `171${seed}`;
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const sum = base
    .split('')
    .map((digit, index) => {
      const value = Number(digit) * coefficients[index];
      return value >= 10 ? value - 9 : value;
    })
    .reduce((total, value) => total + value, 0);
  const verifier = (10 - (sum % 10)) % 10;
  return `${base}${verifier}`;
}

export async function createTestOwner(
  request: APIRequestContext,
  token: string,
  prefix = 'Owner Test',
): Promise<CreatedOwner> {
  const firstName = `${prefix} ${buildAlphaSuffix(Date.now())}`;
  const lastName = `Sistema ${buildAlphaSuffix(documentCounter)}`;
  const documentId = buildValidCedula();
  const email = `owner.${documentId}@petsafe.test`;

  const res = await request.post(`${API_URL}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      firstName,
      lastName,
      documentId,
      phone: '0991234567',
      address: 'Calle de pruebas 123',
      gender: 'OTRO',
      notes: '[TEST SYSTEM] Propietario temporal para pruebas e2e',
    },
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear propietario de prueba: ${res.status()} - ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; person: { firstName: string; lastName: string } };
  return {
    id: body.id,
    fullName: `${body.person.firstName} ${body.person.lastName}`.trim(),
    documentId,
    email,
  };
}

export async function createTestPet(
  request: APIRequestContext,
  token: string,
  prefix = 'Mascota Test',
  clientId?: number,
): Promise<CreatedPet> {
  const name = buildUniqueName(prefix);
  const endpoint = clientId ? `${API_URL}/patients` : `${API_URL}/patients/admin/without-tutor`;
  const multipart: Record<string, string> = {
    name,
    speciesId: '1',
    sex: 'MACHO',
    birthDate: '2024-01-15',
    currentWeight: '8.4',
    sterilized: 'false',
    generalHistory: '[TEST SYSTEM] Mascota temporal para pruebas e2e',
  };

  if (clientId) {
    multipart.clientId = String(clientId);
  }

  const res = await request.post(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    multipart,
  });

  if (!res.ok()) {
    throw new Error(`No se pudo crear mascota de prueba: ${res.status()} - ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number; name: string };
  return {
    id: body.id,
    name: body.name,
  };
}

export async function createTestTreatment(
  request: APIRequestContext,
  token: string,
): Promise<CreatedTreatment> {
  const pet = await createTestPet(request, token, 'Tratamiento Mascota');
  const encounterRes = await request.post(`${API_URL}/encounters`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      patientId: pet.id,
      vetId: Number(process.env['TEST_VET_ID'] ?? 1),
      startTime: new Date(Date.now() - 60_000).toISOString(),
      generalNotes: '[TEST SYSTEM] Consulta temporal para tratamiento e2e',
    },
  });

  if (!encounterRes.ok()) {
    throw new Error(`No se pudo crear encounter de prueba: ${encounterRes.status()} - ${await encounterRes.text()}`);
  }

  const encounter = (await encounterRes.json()) as { id: number };
  const instructions = `Administrar con alimento ${Date.now()}`;
  const treatmentRes = await request.post(`${API_URL}/encounters/${encounter.id}/treatments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      startDate: getTodayKey(),
      endDate: getTodayKey(),
      generalInstructions: instructions,
      items: [
        {
          medication: 'Amoxicilina',
          dose: '250mg',
          frequency: 'Cada 12 horas',
          durationDays: 7,
          administrationRoute: 'Oral',
          notes: '[TEST SYSTEM] Item temporal para pruebas e2e',
        },
      ],
    },
  });

  if (!treatmentRes.ok()) {
    throw new Error(`No se pudo crear tratamiento de prueba: ${treatmentRes.status()} - ${await treatmentRes.text()}`);
  }

  const treatment = (await treatmentRes.json()) as { id: number };
  return {
    id: treatment.id,
    encounterId: encounter.id,
    patientName: pet.name,
    instructions,
  };
}
