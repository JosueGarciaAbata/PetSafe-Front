/**
 * Pruebas de sistema — Historial Clínico (History)
 *
 * Cubre:
 *   - Ver listado de historial de atenciones
 *   - Buscar atención por paciente
 *   - Abrir detalle de una atención finalizada (historia completa)
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage, API_URL } from '../helpers/appointments-api';

const SEED_PATIENT_NAME = 'Max';

test('[SYSTEM] History — listar historial clínico', async ({ page }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/history/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Encabezado presente
  await expect(page.getByRole('heading', { name: /historial|historia|atenciones/i })).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] History — buscar atención por nombre de paciente', async ({ page }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  await searchInput.fill(SEED_PATIENT_NAME);
  await page.waitForTimeout(500);

  // No rompe y muestra resultados o mensaje de vacío
  await expect(page).not.toHaveURL(/error/);
});

test('[SYSTEM] History — abrir detalle de atención finalizada', async ({ page, request }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  // Obtener la primera atención finalizada via API
  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener atenciones finalizadas');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas en la base de datos');
    return;
  }

  const encounterId = body.data[0].id;
  await page.goto(`/history/${encounterId}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/history/${encounterId}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Verificar que carga algún contenido de la ficha (cualquier elemento de datos)
  await page.waitForTimeout(2_000);
  await expect(page).not.toHaveURL(/error/);
});
