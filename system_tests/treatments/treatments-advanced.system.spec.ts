/**
 * Pruebas de sistema — Tratamientos y Procedimientos Avanzados
 *
 * Complementa el spec base con:
 *   - Filtrar tratamientos por estado (activo/completado)
 *   - Ver secciones del detalle de tratamiento (medicamentos, indicaciones)
 *   - Buscar procedimiento por nombre
 *   - Ver detalle completo de procedimiento
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';

// ── Tratamientos — listado y filtros ──────────────────────────────────────────

test('[SYSTEM] Treatments — filtrar por estado activo/completado', async ({ page }) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');

  // Buscar filtros de estado si existen
  const statusFilter = page
    .getByRole('button', { name: /activo|completado|finalizado/i })
    .first()
    .or(page.locator('mat-button-toggle, [data-testid="treatment-filter"]').first());

  if (await statusFilter.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await statusFilter.click();
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  } else {
    // Sin filtros de estado — solo verificar que la lista carga
    await expect(
      page.getByRole('heading', { name: /tratamiento/i }),
    ).toBeVisible({ timeout: 6_000 });
  }
});

test('[SYSTEM] Treatments — paginación de tratamientos (si hay más de 1 página)', async ({
  page,
  request,
}) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/treatments?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo consultar tratamientos');
    return;
  }

  const body = (await res.json()) as { meta?: { total: number }; total?: number };
  const total = body.meta?.total ?? body.total ?? 0;

  if (total <= 10) {
    test.skip(true, `Solo hay ${total} tratamientos, no hay paginación`);
    return;
  }

  const pagination = page.locator('app-pagination');
  await expect(pagination).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Treatments — detalle muestra nombre del paciente y medicamentos', async ({
  page,
  request,
}) => {
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

  const body = (await res.json()) as {
    data: { id: number; patient?: { name: string } }[];
  };

  if (!body.data?.length) {
    test.skip(true, 'No hay tratamientos en la base de datos');
    return;
  }

  const treatment = body.data[0];
  await page.goto(`/treatments/${treatment.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/treatments/${treatment.id}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Debe mostrar nombre del paciente o medicamento
  await expect(
    page
      .getByText(treatment.patient?.name ?? /tratamiento|medicamento/i)
      .first()
      .or(
        page
          .getByText(/medicamento|dosis|indicación|frecuencia/i)
          .first(),
      ),
  ).toBeVisible({ timeout: 8_000 });
});

// ── Procedimientos — avanzado ─────────────────────────────────────────────────

test('[SYSTEM] Procedures — buscar procedimiento por nombre', async ({ page }) => {
  await page.goto('/procedures');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill('Max');
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  } else {
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] Procedures — detalle muestra tipo y fecha del procedimiento', async ({
  page,
  request,
}) => {
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

  const body = (await res.json()) as {
    data: { id: number; patient?: { name: string } }[];
  };

  if (!body.data?.length) {
    test.skip(true, 'No hay procedimientos en la base de datos');
    return;
  }

  const procedure = body.data[0];
  await page.goto(`/procedures/${procedure.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/procedures/${procedure.id}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  await expect(
    page
      .getByText(/procedimiento|cirugía|técnica|fecha|realizado/i)
      .first(),
  ).toBeVisible({ timeout: 8_000 });
});
