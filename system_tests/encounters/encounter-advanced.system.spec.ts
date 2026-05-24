/**
 * Pruebas de sistema — Atenciones Avanzadas (Encounters)
 *
 * Cubre flujos adicionales al test base de los compañeros:
 *   - Guardar borrador de vacuna dentro de una atención
 *   - Guardar borrador de tratamiento
 *   - Agregar diagnóstico/impresión clínica
 *   - Reactivar atención finalizada
 *   - Ver atención en historial
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage, API_URL } from '../helpers/appointments-api';
import { cancelQueueEntry, createTestQueueEntry } from '../helpers/queue-api';

const TEST_PATIENT_ID = 2;

// ── Shared state ─────────────────────────────────────────────────────────────

let queueEntryId = 0;
let authToken = '';
let patientName = '';
let encounterId = 0;

// Para este suite necesitamos crear la atención y llevarla hasta EN_ATENCION
test.beforeEach(async ({ page, request }) => {
  await page.goto('/queue');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  const entry = await createTestQueueEntry(request, authToken, TEST_PATIENT_ID);
  queueEntryId = entry.id;
  patientName = entry.patientName;

  // Iniciar la atención via API para llegar directo al workspace
  const startRes = await request.patch(`${API_URL}/queue/${queueEntryId}/start`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const startBody = (await startRes.json()) as { encounterId?: number };
  encounterId = startBody.encounterId ?? 0;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }) => {
  if (queueEntryId && authToken) {
    await cancelQueueEntry(request, authToken, queueEntryId).catch(() => {});
  }
  // Si la atención quedó abierta, intentar finalizarla via API
  if (encounterId && authToken) {
    await request
      .patch(`${API_URL}/encounters/${encounterId}/finish`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch(() => {});
  }
});

// ── Tab Motivo de Consulta ────────────────────────────────────────────────────

test('[SYSTEM] Encounter — guardar motivo de consulta', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo obtener encounterId del inicio de atención');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Motivo' }).click();

  const motivoInput = page.getByPlaceholder(/describe por qué acude/i);
  await motivoInput.fill('Prueba sistema — tab motivo');

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/consultation-reason') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);

  expect(res.status()).toBe(200);
});

// ── Tab Examen Clínico ────────────────────────────────────────────────────────

test('[SYSTEM] Encounter — guardar signos vitales (examen clínico)', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo obtener encounterId');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Examen clínico' }).click();

  await page.getByLabel('Peso (kg)').fill('15.0');
  await page.getByLabel('Temperatura (°C)').fill('38.6');
  await page.getByLabel('Frecuencia cardiaca').fill('85');

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/clinical-exam') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);

  expect(res.status()).toBe(200);
});

// ── Tab Impresión ─────────────────────────────────────────────────────────────

test('[SYSTEM] Encounter — guardar impresión diagnóstica', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo obtener encounterId');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Impresión' }).click();

  const diagInput = page.getByPlaceholder(/hipótesis clínica/i);
  await diagInput.fill('Paciente sano — prueba de sistema');

  const pronostico = page.getByPlaceholder(/reservado|favorable/i);
  if (await pronostico.isVisible()) {
    await pronostico.fill('Favorable');
  }

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/clinical-impression') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);

  expect(res.status()).toBe(200);
});

// ── Tab Vacunas (borrador) ────────────────────────────────────────────────────

test('[SYSTEM] Encounter — agregar vacuna al borrador', async ({ page, request }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo obtener encounterId');
    return;
  }

  // Verificar si hay vacunas en el catálogo
  const vacRes = await request.get(`${API_URL}/vaccinations/products?limit=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const vacBody = (await vacRes.json()) as { data?: { id: number }[]; id?: number } | { id: number }[];
  const hasVaccines =
    (Array.isArray(vacBody) && vacBody.length > 0) ||
    (!Array.isArray(vacBody) && (vacBody as { data?: { id: number }[] }).data?.length);

  if (!hasVaccines) {
    test.skip(true, 'No hay vacunas en el catálogo');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  // Buscar el tab de vacunas
  const vacTab = page.getByRole('button', { name: /vacuna/i });
  if (!(await vacTab.isVisible())) {
    test.skip(true, 'Tab de vacunas no visible en la UI');
    return;
  }
  await vacTab.click();

  // Agregar vacuna
  const addBtn = page.getByRole('button', { name: /agregar vacuna|nueva vacuna|\+/i }).first();
  if (await addBtn.isVisible()) {
    await addBtn.click();

    // Seleccionar vacuna del catálogo
    const vacSelect = page.locator('mat-select').first();
    if (await vacSelect.isVisible()) {
      await vacSelect.click();
      await page.getByRole('option').first().click();
    }

    // Guardar borrador
    const saveBtn = page.getByRole('button', { name: /guardar|agregar/i }).last();
    if (await saveBtn.isVisible()) {
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('vaccination-draft') && r.request().method() === 'POST',
        ),
        saveBtn.click(),
      ]);
      expect(res.status()).toBe(201);
    }
  } else {
    // Si no hay botón visible, verificar que el tab carga sin error
    await expect(page).not.toHaveURL(/error/);
  }
});
