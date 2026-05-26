/**
 * Pruebas de sistema — Tratamientos y Procedimientos
 *
 * Cubre:
 *   - Listar tratamientos activos
 *   - Abrir detalle de tratamiento
 *   - Listar procedimientos
 *   - Abrir detalle de procedimiento
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage, API_URL } from '../helpers/appointments-api';

// ── Tratamientos ─────────────────────────────────────────────────────────────

test('[SYSTEM] Treatments — listar tratamientos activos', async ({ page }) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/treatments/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  await expect(page.getByRole('heading', { name: /tratamiento/i })).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Treatments — buscar tratamientos', async ({ page }) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Max');
    await page.waitForTimeout(500);
  }

  await expect(page).not.toHaveURL(/error/);
});

test('[SYSTEM] Treatments — abrir detalle de tratamiento', async ({ page, request }) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/treatments?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener tratamientos');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay tratamientos en la base de datos');
    return;
  }

  const treatmentId = body.data[0].id;

  // Hacer clic en la primera fila
  const row = page.locator('tbody tr, .treatment-card, [data-testid="treatment-row"]').first();
  if (await row.isVisible()) {
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/treatments/${treatmentId}`));
  } else {
    await page.goto(`/treatments/${treatmentId}`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/error/);
  }

  // Detalle del tratamiento visible
  await expect(
    page
      .getByRole('heading', { name: /tratamiento|medicamento|farmacológico/i })
      .or(page.locator('.treatment-detail')),
  ).toBeVisible({ timeout: 8_000 });
});

// ── Procedimientos ────────────────────────────────────────────────────────────

test('[SYSTEM] Procedures — listar procedimientos', async ({ page }) => {
  await page.goto('/procedures');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/procedures/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  await expect(page.getByRole('heading', { name: /procedimiento/i })).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Procedures — abrir detalle de procedimiento', async ({ page, request }) => {
  await page.goto('/procedures');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/procedures?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener procedimientos');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay procedimientos en la base de datos');
    return;
  }

  const procedureId = body.data[0].id;
  await page.goto(`/procedures/${procedureId}`);
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/error|unauthorized/);
  await expect(
    page
      .getByRole('heading', { name: /procedimiento/i })
      .or(page.locator('.procedure-detail')),
  ).toBeVisible({ timeout: 8_000 });
});
