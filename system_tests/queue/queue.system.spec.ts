import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { cancelQueueEntry, createTestQueueEntry } from '../helpers/queue-api';

const TEST_PATIENT_ID = 1;
const TEST_PATIENT_SEARCH = 'Max';

// ── Setup para tests que necesitan entrada pre-creada en cola ─────────────────

let queueEntryId = 0;
let patientName = '';
let authToken = '';

test.beforeEach(async ({ page, request }, testInfo) => {
  if (testInfo.title.includes('Registrar ingreso')) return;

  await page.goto('/queue');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  const entry = await createTestQueueEntry(request, authToken, TEST_PATIENT_ID);
  queueEntryId = entry.id;
  patientName = entry.patientName;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }, testInfo) => {
  if (testInfo.title.includes('Registrar ingreso')) return;
  if (queueEntryId && authToken) {
    await cancelQueueEntry(request, authToken, queueEntryId);
  }
});

// ── 1. Registrar ingreso ──────────────────────────────────────────────────────

test('[SYSTEM] Registrar ingreso en cola', async ({ page, request }) => {
  await page.goto('/queue');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  await page.getByRole('button', { name: 'Registrar ingreso' }).click();

  // Buscar paciente
  await page.getByPlaceholder('Buscar por mascota, tutor o identificacion').fill(TEST_PATIENT_SEARCH);
  await page.locator('mat-option').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('mat-option').first().click();

  // Registrar en cola
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/queue') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Registrar en cola' }).click(),
  ]);

  expect(res.status()).toBe(201);

  // Cleanup
  const created = (await res.json()) as { id: number };
  await cancelQueueEntry(request, token, created.id);
});

// ── 2. Cancelar ingreso ───────────────────────────────────────────────────────

test('[SYSTEM] Cancelar ingreso de la cola', async ({ page }) => {
  // Abrir detalle del paciente en espera
  await page.locator('tr[tabindex="0"]')
    .filter({ hasText: patientName })
    .filter({ hasText: 'En espera' })
    .first()
    .click();

  await expect(page.getByRole('button', { name: 'Cancelar ingreso' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar ingreso' }).click();

  // Confirmar en el modal de confirmación
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/cancel') && r.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: 'Si, cancelar' }).click(),
  ]);

  expect(res.status()).toBe(200);
});

// ── 3. Iniciar atención ───────────────────────────────────────────────────────

test('[SYSTEM] Iniciar atención desde la cola', async ({ page }) => {
  // Abrir detalle del paciente en espera
  await page.locator('tr[tabindex="0"]')
    .filter({ hasText: patientName })
    .filter({ hasText: 'En espera' })
    .first()
    .click();

  await expect(page.getByRole('button', { name: 'Iniciar atencion' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar atencion' }).click();

  // Confirmar en el modal de confirmación
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/start') && r.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: 'Si, iniciar atencion' }).click(),
  ]);

  expect(res.status()).toBe(200);
});
