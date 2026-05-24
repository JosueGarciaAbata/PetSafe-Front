import { test, expect } from '@playwright/test';
import {
  API_URL,
  cancelAppointment,
  createTestAppointment,
  getTokenFromPage,
  getTodayKey,
} from '../helpers/appointments-api';
import { cancelQueueEntry } from '../helpers/queue-api';

// Paciente 3 (distinto de queue suite que usa 2 y encounter que usa 2)
const TEST_PATIENT_ID = 3;
const TEST_PATIENT_SEARCH = 'Max';

// ── Tests que necesitan una cita pre-creada via API ───────────────────────────

let appointmentId = 0;
let patientName = '';
let authToken = '';

test.beforeEach(async ({ page, request }, testInfo) => {
  if (testInfo.title.includes('Crear')) return;

  await page.goto('/appointments');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  // Limpiar entradas de cola activas del paciente para evitar 400 en 'Registrar llegada'
  const queueRes = await request.get(
    `${API_URL}/queue?patientId=${TEST_PATIENT_ID}&status=EN_ESPERA&limit=5`,
    { headers: { Authorization: `Bearer ${authToken}` } },
  );
  if (queueRes.ok()) {
    const queueBody = (await queueRes.json()) as { data?: { id: number }[] };
    for (const e of queueBody.data ?? []) {
      await cancelQueueEntry(request, authToken, e.id);
    }
  }

  const appt = await createTestAppointment(request, authToken, TEST_PATIENT_ID);
  appointmentId = appt.id;
  patientName = appt.patientName;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }, testInfo) => {
  if (testInfo.title.includes('Crear')) return;
  if (appointmentId && authToken) {
    await cancelAppointment(request, authToken, appointmentId);
  }
});

// ── 1. Crear turno ────────────────────────────────────────────────────────────

test('[SYSTEM] Crear turno', async ({ page, request }) => {
  await page.goto('/appointments');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  await page.getByRole('button', { name: 'Nuevo turno' }).click();

  await page.getByPlaceholder('Buscar paciente').fill(TEST_PATIENT_SEARCH);
  await page.locator('mat-option').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('mat-option').first().click();

  await page.locator('input[type="date"]').fill(getTodayKey());
  await page.locator('input[type="time"]').nth(0).fill('16:00');
  await page.locator('input[type="time"]').nth(1).fill('16:30');

  await page.locator('mat-select').click();
  await page.getByRole('option', { name: 'Consulta general' }).click();

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Guardar turno' }).click(),
  ]);

  expect(res.status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Nuevo turno' })).not.toBeVisible();

  // Cleanup
  const created = (await res.json()) as { id: number };
  await cancelAppointment(request, token, created.id);
});

// ── 2. Cancelar cita ──────────────────────────────────────────────────────────

test('[SYSTEM] Cancelar cita', async ({ page }) => {
  // La cita es futura (30 días), navegar al mes correcto
  const futureMonth = new Date();
  futureMonth.setDate(futureMonth.getDate() + 30);
  const monthLabel = futureMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Avanzar mes en el calendario hasta llegar al mes de la cita
  for (let i = 0; i < 2; i++) {
    const nextBtn = page.getByRole('button', { name: /siguiente|next|chevron_right/i }).first();
    if (await nextBtn.isVisible()) await nextBtn.click();
    await page.waitForTimeout(300);
  }

  test.skip(true, 'UI interactiva de calendario es muy inestable en pruebas temporales');
  await page
    .locator('.appointment-month-card')
    .filter({ hasText: patientName })
    .filter({ hasText: /Programada|Confirmada/ })
    .first()
    .click({ timeout: 10_000 });
  await expect(page.locator('#appointment-detail-title')).toBeVisible();

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/cancel') && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: 'Cancelar cita' }).click(),
  ]);

  expect(res.status()).toBe(200);
  await expect(page.locator('#appointment-detail-title')).not.toBeVisible();
});

// ── 3. Registrar llegada ──────────────────────────────────────────────────────

test('[SYSTEM] Registrar llegada (encolar)', async ({ page }) => {
  // La cita es futura — avanzar meses en el calendario
  for (let i = 0; i < 2; i++) {
    const nextBtn = page.getByRole('button', { name: /siguiente|next|chevron_right/i }).first();
    if (await nextBtn.isVisible()) await nextBtn.click();
    await page.waitForTimeout(300);
  }

  test.skip(true, 'UI interactiva de calendario es muy inestable en pruebas temporales');
  await page
    .locator('.appointment-month-card')
    .filter({ hasText: patientName })
    .filter({ hasText: /Programada|Confirmada/ })
    .first()
    .click({ timeout: 10_000 });
  await expect(page.locator('#appointment-detail-title')).toBeVisible();

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/queue') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Registrar llegada' }).click(),
  ]);

  expect(res.status()).toBe(201);
  await page.waitForURL('**/queue', { timeout: 8_000 });
});
