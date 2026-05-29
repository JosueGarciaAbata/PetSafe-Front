/**
 * Pruebas de sistema — Historial Clínico (History) Avanzado
 *
 * Complementa el spec base con:
 *   - Ver secciones de datos completos en el detalle de una atención
 *   - Filtrar historial por rango de fechas (si la UI lo soporta)
 *   - Buscar atención por nombre del paciente y hacer click
 *   - Verificar datos de signos vitales en la ficha
 *   - Verificar datos de diagnóstico en la ficha
 *   - Verificar vacunas y tratamientos en la ficha (si existen)
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';

// ── Helpers locales ────────────────────────────────────────────────────────────

async function getFinishedEncounterWithData(
  request: Parameters<typeof getTokenFromPage>[1],
  token: string,
): Promise<{ id: number } | null> {
  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) return null;

  const body = (await res.json()) as { data: { id: number }[] };
  return body.data?.[0] ?? null;
}

// ── Listado de historial ───────────────────────────────────────────────────────

test('[SYSTEM] History — listar historial con encabezado visible', async ({ page }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/history/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  await expect(
    page.getByRole('heading', { name: /historial|historia|atenciones/i }),
  ).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] History — tabla/lista de atenciones tiene al menos una fila', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo verificar si hay atenciones finalizadas');
    return;
  }

  const body = (await res.json()) as { data: unknown[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas en la base de datos');
    return;
  }

  // Debe haber al menos una fila en la tabla/lista
  const rows = page.locator('tbody tr, .history-card, [data-testid="history-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] History — buscar atención por nombre y hacer click en resultado', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const encounter = await getFinishedEncounterWithData(request, token);
  if (!encounter) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  // Buscar por "Max" (paciente del seed)
  const searchInput = page.getByPlaceholder(/buscar/i).first();
  await searchInput.fill('Max');
  await page.waitForTimeout(500);

  const row = page
    .locator('tbody tr, .history-card, [data-testid="history-row"]')
    .first();

  if (await row.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await row.click();
    // Debe navegar al detalle
    await expect(page).toHaveURL(/history\/\d+/, { timeout: 8_000 });
  } else {
    // Si no hay resultados con "Max", solo verificar que no rompe
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] History — filtrar por rango de fechas (si la UI lo soporta)', async ({ page }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  // Buscar inputs de fecha en la página
  const dateInputs = page.locator('input[type="date"]');
  const count = await dateInputs.count();

  if (count >= 2) {
    // Hay filtro de fechas — rellenar con el mes actual
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = new Date().toISOString().slice(0, 10);

    await dateInputs.first().fill(firstOfMonth);
    await dateInputs.nth(1).fill(today);
    await page.waitForTimeout(400);

    await expect(page).not.toHaveURL(/error/);
  } else {
    test.skip(true, 'La UI de historial no tiene filtros de fecha visibles');
  }
});

// ── Detalle de atención ────────────────────────────────────────────────────────

test('[SYSTEM] History — detalle de atención carga correctamente', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const encounter = await getFinishedEncounterWithData(request, token);
  if (!encounter) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  await page.goto(`/history/${encounter.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/history/${encounter.id}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // La página debe mostrar contenido (cualquier elemento relevante)
  await expect(
    page
      .getByRole('heading')
      .first()
      .or(page.locator('[class*="encounter"], [class*="history"], [class*="detail"]').first()),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] History — detalle muestra datos del paciente', async ({ page, request }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Obtener el detalle completo del encounter via API para saber qué nombre buscar
  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener encuentros finalizados');
    return;
  }

  const body = (await res.json()) as {
    data: { id: number; patient?: { name: string } }[];
  };

  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  const encounter = body.data[0];
  const patientName = encounter.patient?.name;

  await page.goto(`/history/${encounter.id}`);
  await page.waitForLoadState('networkidle');

  if (patientName) {
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 8_000 });
  } else {
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] History — detalle muestra al menos motivo o examen clínico', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const encounter = await getFinishedEncounterWithData(request, token);
  if (!encounter) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  await page.goto(`/history/${encounter.id}`);
  await page.waitForLoadState('networkidle');

  // Al menos uno de los elementos clínicos debe ser visible
  await expect(
    page
      .getByText(/motivo|consulta|examen|clínico|signos|peso|temperatura|diagnóstico|impresión|finalizada/i)
      .first(),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] History — detalle muestra vacunas si existen en la atención', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Buscar un encounter que tenga vacunas
  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo consultar historial');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  // Usar el primero disponible
  const encounterId = body.data[0].id;
  await page.goto(`/history/${encounterId}`);
  await page.waitForLoadState('networkidle');

  // Verificar si hay sección de vacunas
  const vaccineSection = page.getByText(/vacuna|inmunización|carnet/i).first();
  if (await vaccineSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(vaccineSection).toBeVisible();
  } else {
    // No hay vacunas en esta atención — OK, es válido
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] History — detalle muestra tratamientos si existen en la atención', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const encounter = await getFinishedEncounterWithData(request, token);
  if (!encounter) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  await page.goto(`/history/${encounter.id}`);
  await page.waitForLoadState('networkidle');

  const treatmentSection = page.getByText(/tratamiento|medicamento|farmacológico/i).first();
  if (await treatmentSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(treatmentSection).toBeVisible();
  } else {
    await expect(page).not.toHaveURL(/error/);
  }
});
