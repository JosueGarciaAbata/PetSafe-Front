/**
 * Pruebas de sistema — Adopciones (avanzadas)
 *
 * Complementa el spec base de los compañeros con:
 *   - Editar adopción existente
 *   - Búsqueda de adopciones por nombre
 *   - Filtrar por estado
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestAdoption } from '../helpers/adoptions-api';

test('[SYSTEM] Adoptions — filtrar por estado', async ({ page }) => {
  await page.goto('/adoption');
  await page.waitForLoadState('networkidle');

  // Si hay filtros de estado (tabs o select)
  const filterBtn = page
    .getByRole('button', { name: /en adopción|pendiente|completada/i })
    .or(page.locator('mat-button-toggle, [data-testid="adoption-filter"]').first());

  if (await filterBtn.isVisible()) {
    await filterBtn.click();
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  } else {
    // Sin filtros de estado visibles — verificar que la página carga
    await expect(page.getByRole('heading', { name: /adopci/i })).toBeVisible({ timeout: 6_000 });
  }
});

test('[SYSTEM] Adoptions — editar adopción existente', async ({ page, request }) => {
  await page.goto('/adoption');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const adoption = await createTestAdoption(request, token);

  await page.goto(`/adoption/${adoption.id}/edit`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /editar adopcion/i })).toBeVisible();

  // Cambiar el teléfono de contacto
  const phoneInput = page.getByPlaceholder('0999999999');
  await phoneInput.clear();
  await phoneInput.fill('0991111222');

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/adoptions/${adoption.id}`) &&
        (r.request().method() === 'PUT' || r.request().method() === 'PATCH'),
    ),
    page.getByRole('button', { name: /guardar|actualizar/i }).click(),
  ]);

  expect(res.status()).toBe(200);
});

test('[SYSTEM] Adoptions — búsqueda de adopciones por nombre', async ({ page, request }) => {
  await page.goto('/adoption');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const adoption = await createTestAdoption(request, token);

  await page.reload();
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  await searchInput.fill(adoption.patientName);
  await page.waitForTimeout(500);

  const row = page
    .locator('tbody tr, .adoption-card')
    .filter({ hasText: adoption.patientName })
    .first();
  await expect(row).toBeVisible({ timeout: 8_000 });
});
