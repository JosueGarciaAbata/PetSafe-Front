/**
 * Pruebas de sistema — Reportería (Reports)
 *
 * Cubre:
 *   - Carga de la página con h1 "Reporteria"
 *   - Búsqueda de pacientes: con resultados, sin resultados
 *   - Seleccionar paciente de la lista
 *   - Generar y previsualizar PDF del historial clínico
 *   - Generar y previsualizar PDF de la agenda del día
 *   - Generar PDF de agenda por rango de fechas
 *   - Validaciones: sin fechas, fecha inicio > fin
 *   - Cerrar vista previa del PDF
 *   - Estado "Generando..." durante la generación del PDF
 *   - Paginación en resultados de pacientes
 *   - Verificación directa de los endpoints PDF via API
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage, getTodayKey, getFutureDateKey } from '../helpers/appointments-api';
import { downloadClinicalHistoryPdf, downloadAppointmentsPdf } from '../helpers/reports-api';

// Paciente del seed que siempre existe
const SEED_PATIENT_NAME = 'Max';
const SEED_PATIENT_ID = 1;

// ── Helpers locales ────────────────────────────────────────────────────────────

async function gotoReports(page: Parameters<typeof getTokenFromPage>[0]) {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');
}

/** Espera a que la búsqueda de pacientes termine de cargar */
async function waitForSearchResults(page: Parameters<typeof getTokenFromPage>[0]) {
  await page.waitForFunction(
    () => !document.querySelector('[class*="Buscando"]') &&
          !document.textContent?.includes('Buscando pacientes'),
    { timeout: 8_000 },
  ).catch(() => {/* puede que ya haya cargado */});
  await page.waitForTimeout(400);
}

// ── Carga y estructura ─────────────────────────────────────────────────────────

test('[SYSTEM] Reports — página carga con encabezado correcto', async ({ page }) => {
  await gotoReports(page);

  await expect(page).toHaveURL(/reports/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // h1 con "Reporteria"
  await expect(page.getByRole('heading', { level: 1, name: /reporteria/i })).toBeVisible({
    timeout: 8_000,
  });
});

test('[SYSTEM] Reports — sección de historial clínico es visible', async ({ page }) => {
  await gotoReports(page);

  await expect(page.getByRole('heading', { name: /historial clinico del paciente/i })).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.getByText(/busca una mascota registrada/i)).toBeVisible();
  // Input de búsqueda
  await expect(
    page.getByPlaceholder(/buscar por nombre del paciente/i),
  ).toBeVisible();
});

test('[SYSTEM] Reports — sección de agenda de citas es visible', async ({ page }) => {
  await gotoReports(page);

  await expect(page.getByRole('heading', { name: /agenda de citas/i })).toBeVisible({
    timeout: 8_000,
  });
  // Inputs de fecha
  const dateInputs = page.locator('input[type="date"]');
  await expect(dateInputs.first()).toBeVisible();
  await expect(dateInputs.nth(1)).toBeVisible();
  // Botón "Ver PDF"
  await expect(page.getByRole('button', { name: /ver pdf/i }).last()).toBeVisible();
});

// ── Búsqueda de pacientes ──────────────────────────────────────────────────────

test('[SYSTEM] Reports — carga inicial muestra lista de pacientes', async ({ page }) => {
  await gotoReports(page);
  await waitForSearchResults(page);

  // Al cargar, debe mostrar pacientes del sistema
  const rows = page.locator('.divide-y > div[class*="flex"]');
  const count = await rows.count();

  if (count > 0) {
    // Cada fila tiene botón "Ver PDF"
    await expect(rows.first().getByRole('button', { name: /ver pdf/i })).toBeVisible();
  } else {
    // Si no hay pacientes, muestra mensaje vacío
    await expect(
      page.getByText(/no se encontraron pacientes/i),
    ).toBeVisible({ timeout: 6_000 });
  }
});

test('[SYSTEM] Reports — búsqueda por nombre filtra resultados', async ({ page }) => {
  await gotoReports(page);

  const searchInput = page.getByPlaceholder(/buscar por nombre del paciente/i);
  await searchInput.fill(SEED_PATIENT_NAME);

  // Esperar debounce de 300ms y carga
  await page.waitForTimeout(500);
  await waitForSearchResults(page);

  // Debe aparecer al menos un resultado con "Max"
  await expect(
    page.getByText(SEED_PATIENT_NAME, { exact: false }).first(),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] Reports — búsqueda sin resultados muestra mensaje vacío', async ({ page }) => {
  await gotoReports(page);

  const searchInput = page.getByPlaceholder(/buscar por nombre del paciente/i);
  await searchInput.fill('XxPacienteQueNoExisteXx');

  await page.waitForTimeout(500);
  await waitForSearchResults(page);

  await expect(
    page.getByText(/no se encontraron pacientes con ese criterio/i),
  ).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Reports — seleccionar paciente lo resalta en la lista', async ({ page }) => {
  await gotoReports(page);
  await waitForSearchResults(page);

  const firstPatientBtn = page
    .locator('.divide-y > div[class*="flex"]')
    .first()
    .getByRole('button')
    .first();

  const isVisible = await firstPatientBtn.isVisible({ timeout: 4_000 }).catch(() => false);
  if (!isVisible) {
    test.skip(true, 'No hay pacientes en la lista para seleccionar');
    return;
  }

  await firstPatientBtn.click();

  // La fila seleccionada debe tener clase bg-card
  await expect(
    page.locator('.divide-y > div[class*="bg-card"]'),
  ).toBeVisible({ timeout: 4_000 });
});

// ── Generación de PDF — Historial Clínico ─────────────────────────────────────

test('[SYSTEM] Reports — generar y previsualizar historial clínico del paciente', async ({
  page,
}) => {
  await gotoReports(page);

  const searchInput = page.getByPlaceholder(/buscar por nombre del paciente/i);
  await searchInput.fill(SEED_PATIENT_NAME);
  await page.waitForTimeout(500);
  await waitForSearchResults(page);

  // Buscar el botón "Ver PDF" del primer resultado
  const pdfBtn = page
    .locator('.divide-y > div[class*="flex"]')
    .first()
    .getByRole('button', { name: /ver pdf/i });

  const isVisible = await pdfBtn.isVisible({ timeout: 6_000 }).catch(() => false);
  if (!isVisible) {
    test.skip(true, `No hay resultados para "${SEED_PATIENT_NAME}"`);
    return;
  }

  // El botón debe cambiar a "Generando..." al hacer click
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/reports/patients/') &&
        r.url().includes('/clinical-history/pdf') &&
        r.request().method() === 'GET',
      { timeout: 30_000 },
    ),
    pdfBtn.click(),
  ]);

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');

  // La vista previa debe abrirse con iframe
  await expect(page.locator('iframe[title="Vista previa del reporte"]')).toBeVisible({
    timeout: 10_000,
  });

  // Título del modal
  await expect(page.getByText(/historial clinico del paciente/i)).toBeVisible();

  // Mensaje de éxito (texto verde)
  await expect(
    page.locator('.rounded-xl.border-\\[\\#A7F3D0\\]').or(
      page.getByText(/vista previa generada para/i)
    ),
  ).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Reports — cerrar vista previa del historial clínico', async ({ page }) => {
  await gotoReports(page);

  const searchInput = page.getByPlaceholder(/buscar por nombre del paciente/i);
  await searchInput.fill(SEED_PATIENT_NAME);
  await page.waitForTimeout(500);
  await waitForSearchResults(page);

  const pdfBtn = page
    .locator('.divide-y > div[class*="flex"]')
    .first()
    .getByRole('button', { name: /ver pdf/i });

  const isVisible = await pdfBtn.isVisible({ timeout: 6_000 }).catch(() => false);
  if (!isVisible) {
    test.skip(true, 'No hay resultados para abrir vista previa');
    return;
  }

  await pdfBtn.click();

  // Esperar a que se abra el modal
  await expect(page.locator('iframe[title="Vista previa del reporte"]')).toBeVisible({
    timeout: 30_000,
  });

  // Cerrar con el botón ✕ (aria-label "Cerrar vista previa")
  await page.getByRole('button', { name: /cerrar vista previa/i }).click();

  // El modal debe desaparecer
  await expect(page.locator('iframe[title="Vista previa del reporte"]')).not.toBeVisible({
    timeout: 4_000,
  });
});

// ── Generación de PDF — Agenda de Citas ──────────────────────────────────────

test('[SYSTEM] Reports — generar agenda del día (fecha inicio = fecha fin = hoy)', async ({
  page,
}) => {
  await gotoReports(page);

  const today = getTodayKey();
  const dateInputs = page.locator('input[type="date"]');

  await dateInputs.first().fill(today);
  await dateInputs.nth(1).fill(today);

  const agendaBtn = page.getByRole('button', { name: /ver pdf/i }).last();
  await expect(agendaBtn).toBeVisible();

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/reports/schedule/pdf') &&
        r.request().method() === 'GET',
      { timeout: 30_000 },
    ),
    agendaBtn.click(),
  ]);

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');

  // Modal de vista previa
  await expect(page.locator('iframe[title="Vista previa del reporte"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/agenda de citas/i)).toBeVisible();
});

test('[SYSTEM] Reports — generar agenda por rango de fechas (7 días)', async ({ page }) => {
  await gotoReports(page);

  const from = getTodayKey();
  const to = getFutureDateKey(7);
  const dateInputs = page.locator('input[type="date"]');

  await dateInputs.first().fill(from);
  await dateInputs.nth(1).fill(to);

  const agendaBtn = page.getByRole('button', { name: /ver pdf/i }).last();

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/reports/schedule/pdf') &&
        r.request().method() === 'GET',
      { timeout: 30_000 },
    ),
    agendaBtn.click(),
  ]);

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');

  await expect(page.locator('iframe[title="Vista previa del reporte"]')).toBeVisible({
    timeout: 10_000,
  });
});

test('[SYSTEM] Reports — validación: sin fechas muestra error', async ({ page }) => {
  await gotoReports(page);

  // Limpiar los inputs de fecha
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill('');
  await dateInputs.nth(1).fill('');

  const agendaBtn = page.getByRole('button', { name: /ver pdf/i }).last();
  await agendaBtn.click();

  // Mensaje de error
  await expect(
    page.getByText(/debes indicar la fecha inicial y final/i),
  ).toBeVisible({ timeout: 4_000 });

  // No se abre el modal de vista previa
  await expect(page.locator('iframe[title="Vista previa del reporte"]')).not.toBeVisible();
});

test('[SYSTEM] Reports — validación: fecha inicio mayor que fecha fin muestra error', async ({
  page,
}) => {
  await gotoReports(page);

  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill('2026-12-31');
  await dateInputs.nth(1).fill('2026-01-01');

  const agendaBtn = page.getByRole('button', { name: /ver pdf/i }).last();
  await agendaBtn.click();

  await expect(
    page.getByText(/la fecha inicial no puede ser mayor que la fecha final/i),
  ).toBeVisible({ timeout: 4_000 });

  await expect(page.locator('iframe[title="Vista previa del reporte"]')).not.toBeVisible();
});

test('[SYSTEM] Reports — estado "Generando..." durante la generación del PDF de agenda', async ({
  page,
}) => {
  // Retrasar la respuesta del PDF para capturar el estado intermedio
  let resolveDelay!: () => void;
  const delay = new Promise<void>((r) => { resolveDelay = r; });

  await page.route('**/reports/schedule/pdf**', async (route) => {
    await delay;
    await route.continue();
  });

  await gotoReports(page);

  const today = getTodayKey();
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill(today);
  await dateInputs.nth(1).fill(today);

  const agendaBtn = page.getByRole('button', { name: /ver pdf/i }).last();
  await agendaBtn.click();

  // Inmediatamente debe mostrar "Generando..." en el botón
  await expect(agendaBtn).toContainText(/generando/i, { timeout: 3_000 });
  // El botón debe estar deshabilitado
  await expect(agendaBtn).toBeDisabled();

  // Liberar la respuesta
  resolveDelay();

  // Después de cargar, el botón debe volver a "Ver PDF"
  await expect(agendaBtn).toContainText(/ver pdf/i, { timeout: 15_000 });
});

// ── Paginación ─────────────────────────────────────────────────────────────────

test('[SYSTEM] Reports — paginación de pacientes (si hay más de 6)', async ({
  page,
  request,
}) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  // Verificar total de pacientes via API
  const res = await request.get(`${API_URL}/patients?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener el total de pacientes');
    return;
  }

  const body = (await res.json()) as { meta?: { total: number }; total?: number };
  const total = body.meta?.total ?? body.total ?? 0;

  if (total <= 6) {
    test.skip(true, `Solo hay ${total} pacientes, no hay paginación`);
    return;
  }

  // Debe aparecer la paginación
  await waitForSearchResults(page);
  const pagination = page.locator('app-pagination');
  await expect(pagination).toBeVisible({ timeout: 6_000 });

  // Ir a página 2
  const nextBtn = pagination.getByRole('button', { name: /siguiente|>/i }).first();
  if (await nextBtn.isVisible()) {
    const [pageRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/patients') && r.url().includes('page=2'),
        { timeout: 8_000 },
      ),
      nextBtn.click(),
    ]);
    expect(pageRes.status()).toBe(200);
  }
});

// ── Verificación directa de API de reportes ────────────────────────────────────

test('[SYSTEM] Reports API — endpoint de historial clínico devuelve PDF', async ({
  page,
  request,
}) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const result = await downloadClinicalHistoryPdf(request, token, SEED_PATIENT_ID);

  expect(result.ok).toBe(true);
  expect(result.contentType).toContain('application/pdf');
  expect(result.size).toBeGreaterThan(1000); // PDF no vacío
});

test('[SYSTEM] Reports API — endpoint de agenda PDF devuelve PDF', async ({
  page,
  request,
}) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const today = getTodayKey();
  const result = await downloadAppointmentsPdf(request, token, today, today);

  expect(result.ok).toBe(true);
  expect(result.contentType).toContain('application/pdf');
  expect(result.size).toBeGreaterThan(500);
});
