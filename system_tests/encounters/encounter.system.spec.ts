import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { cancelQueueEntry, createTestQueueEntry } from '../helpers/queue-api';

const TEST_PATIENT_ID = 2;

// ── Setup: crea una entrada de cola en EN_ESPERA antes del test ───────────────

let queueEntryId = 0;
let patientName = '';
let authToken = '';

test.beforeEach(async ({ page, request }) => {
  await page.goto('/queue');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  const entry = await createTestQueueEntry(request, authToken, TEST_PATIENT_ID);
  queueEntryId = entry.id;
  patientName = entry.patientName;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }) => {
  if (queueEntryId && authToken) {
    await cancelQueueEntry(request, authToken, queueEntryId);
  }
});

// ── Flujo completo de atención ────────────────────────────────────────────────

test('[SYSTEM] Flujo completo — iniciar atención, llenar datos y finalizar', async ({ page }) => {

  // 1. Abrir detalle desde la cola
  await page.locator('tr[tabindex="0"]')
    .filter({ hasText: patientName })
    .filter({ hasText: 'En espera' })
    .first()
    .click();

  await expect(page.getByRole('button', { name: 'Iniciar atencion' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar atencion' }).click();

  // 2. Confirmar inicio y esperar navegación al workspace
  await Promise.all([
    page.waitForURL('**/encounters/**', { timeout: 15_000 }),
    page.getByRole('button', { name: 'Si, iniciar atencion' }).click(),
  ]);

  await page.waitForLoadState('networkidle');

  // 3. Tab Motivo — llenar motivo principal
  await page.getByRole('button', { name: 'Motivo' }).click();
  await page.getByPlaceholder('Describe por qué acude hoy la mascota.').fill('Consulta de rutina anual');
  await page.getByPlaceholder('Inicio, evolución y signos actuales.').fill('Paciente activo, sin signos aparentes de enfermedad');

  const [saveReason] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/consultation-reason') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);
  expect(saveReason.status()).toBe(200);

  // 4. Tab Examen clínico — llenar signos vitales
  await page.getByRole('button', { name: 'Examen clínico' }).click();
  await page.getByLabel('Peso (kg)').fill('12.5');
  await page.getByLabel('Temperatura (°C)').fill('38.5');
  await page.getByLabel('Frecuencia cardiaca').fill('90');

  const [saveExam] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/clinical-exam') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);
  expect(saveExam.status()).toBe(200);

  // 5. Tab Impresión — llenar diagnóstico
  await page.getByRole('button', { name: 'Impresión' }).click();
  await page.getByPlaceholder('Hipótesis clínica principal.').fill('Paciente sano, sin hallazgos relevantes');
  await page.getByPlaceholder('Reservado, favorable, etc.').fill('Favorable');

  const [saveImpression] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/clinical-impression') && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Guardar progreso' }).click(),
  ]);
  expect(saveImpression.status()).toBe(200);

  // 6. Finalizar atención — clic en header, luego confirmar en dialog
  await page.getByRole('button', { name: 'Finalizar atención' }).click();
  await expect(page.getByText('Finalizar atención médica')).toBeVisible();

  const [finishRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/finish') && r.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: 'Finalizar atención' }).last().click(),
  ]);

  expect(finishRes.status()).toBe(200);
});
