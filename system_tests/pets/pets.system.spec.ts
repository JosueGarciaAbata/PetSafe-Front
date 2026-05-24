/**
 * Pruebas de sistema — Módulo de Mascotas (Pets)
 *
 * Cubre:
 *   - Listar mascotas con búsqueda
 *   - Crear mascota con tutor desde la UI
 *   - Abrir detalle de mascota
 *   - Editar mascota
 *   - Ver ficha de vacunación del paciente
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestOwner, deleteTestOwner } from '../helpers/owners-api';
import { createTestPet, buildTestPetName } from '../helpers/pets-api';

// IDs estables del seed — ajustar si cambia el seed
const SEED_PATIENT_ID = 1;
const SEED_PATIENT_NAME = 'Max';

// ── Datos compartidos entre tests de detalle/edición ────────────────────────

let ownerId = 0;
let petId = 0;
let petName = '';
let authToken = '';

test.beforeEach(async ({ page, request }, testInfo) => {
  if (testInfo.title.includes('listar') || testInfo.title.includes('búsqueda')) return;

  await page.goto('/pets');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  const owner = await createTestOwner(request, authToken);
  ownerId = owner.id;

  petName = buildTestPetName('Mascota Sistema');
  const pet = await createTestPet(request, authToken, ownerId, petName);
  petId = pet.id;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }, testInfo) => {
  if (testInfo.title.includes('listar') || testInfo.title.includes('búsqueda')) return;
  if (authToken) {
    // Las mascotas se eliminan en cascada con el owner o via delete independiente
    await request
      .delete(`http://localhost:3000/api/clients/${ownerId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch(() => {});
  }
});

// ── Tests de listado ─────────────────────────────────────────────────────────

test('[SYSTEM] Pets — listar mascotas', async ({ page }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /mascotas|pacientes/i })).toBeVisible();
  const rows = page.locator('tbody tr, .pet-card, [data-testid="pet-row"]');
  await expect(rows.first()).toBeVisible();
});

test('[SYSTEM] Pets — búsqueda por nombre filtra resultados', async ({ page }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  await searchInput.fill(SEED_PATIENT_NAME);
  await page.waitForTimeout(500);

  const rows = page.locator('tbody tr, .pet-card, [data-testid="pet-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 6_000 });
  await expect(rows.first()).toContainText(SEED_PATIENT_NAME);
});

// ── Tests de detalle ─────────────────────────────────────────────────────────

test('[SYSTEM] Pets — abrir detalle de mascota desde listado', async ({ page }) => {
  const searchInput = page.getByPlaceholder(/buscar/i).first();
  await searchInput.fill(petName);
  await page.waitForTimeout(500);

  const row = page
    .locator('tbody tr, .pet-card, [data-testid="pet-row"]')
    .filter({ hasText: petName })
    .first();
  await expect(row).toBeVisible({ timeout: 8_000 });
  await row.click();

  await expect(page).toHaveURL(new RegExp(`/pets/${petId}`));
  await expect(page.getByText(petName)).toBeVisible();
});

test('[SYSTEM] Pets — editar datos básicos de mascota', async ({ page }) => {
  await page.goto(`/pets/${petId}/edit`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/edit/);
  // Cambiar peso
  const weightInput = page.locator('input[formControlName="currentWeight"], input[type="number"]').first();
  await weightInput.clear();
  await weightInput.fill('6.5');

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/patients/${petId}`) &&
        (r.request().method() === 'PUT' || r.request().method() === 'PATCH'),
    ),
    page.getByRole('button', { name: /guardar|actualizar/i }).click(),
  ]);

  expect(res.status()).toBe(200);
});

// ── Tests de vacunación del paciente ─────────────────────────────────────────

test('[SYSTEM] Pets — ver ficha de vacunación del paciente', async ({ page }) => {
  await page.goto(`/pets/${SEED_PATIENT_ID}/vaccination`);
  await page.waitForLoadState('networkidle');

  // La página de vacunación carga correctamente
  await expect(page).toHaveURL(new RegExp(`/pets/${SEED_PATIENT_ID}/vaccination`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Hay un título o sección de vacunación visible
  const heading = page.getByRole('heading', { name: /vacuna|carnet|plan/i });
  await expect(heading.or(page.locator('.vaccination-header, [data-testid="vaccination-title"]'))).toBeVisible({ timeout: 8_000 });
});
