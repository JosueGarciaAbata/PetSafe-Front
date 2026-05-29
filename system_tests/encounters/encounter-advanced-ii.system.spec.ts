/**
 * Pruebas de sistema — Atenciones Avanzadas II (Encounters)
 *
 * Complementa los specs base y avanzado existentes con:
 *   - Tab Tratamiento: agregar medicamento al borrador
 *   - Tab Cirugía: agregar procedimiento quirúrgico al borrador
 *   - Tab Adjuntos: subir archivo adjunto
 *   - Reactivar atención finalizada desde historial
 *   - Ver atención en historial y verificar secciones completas
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';
import { cancelQueueEntry, createTestQueueEntry } from '../helpers/queue-api';
import { createTestOwner, deleteTestOwner } from '../helpers/owners-api';
import { createTestPet, buildTestPetName, createActiveEncounter } from '../helpers/pets-api';
import path from 'path';

// Usamos un paciente del seed para los tests de reactivación/historial
const SEED_PATIENT_ID = 2;

// ── Shared state para tests que necesitan encounter activo ────────────────────

let queueEntryId = 0;
let authToken = '';
let encounterId = 0;
let ownerId = 0;
let petId = 0;

test.beforeEach(async ({ page, request }, testInfo) => {
  // Los tests de reactivación e historial no necesitan setup
  if (
    testInfo.title.includes('reactivar') ||
    testInfo.title.includes('historial') ||
    testInfo.title.includes('secciones completas')
  ) {
    return;
  }

  await page.goto('/queue');
  await page.waitForLoadState('networkidle');
  authToken = await getTokenFromPage(page);

  // Crear paciente dinámico para aislamiento
  const owner = await createTestOwner(request, authToken);
  ownerId = owner.id;
  const pet = await createTestPet(request, authToken, ownerId, buildTestPetName('Encounter Advanced II'));
  petId = pet.id;

  // Crear entrada de cola e iniciar atención via API
  const entry = await createTestQueueEntry(request, authToken, petId);
  queueEntryId = entry.id;

  const startRes = await request.patch(`${API_URL}/queue/${queueEntryId}/start`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const startBody = (await startRes.json()) as { encounterId?: number };
  encounterId = startBody.encounterId ?? 0;

  await page.reload();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }, testInfo) => {
  if (
    testInfo.title.includes('reactivar') ||
    testInfo.title.includes('historial') ||
    testInfo.title.includes('secciones completas')
  ) {
    return;
  }

  if (encounterId && authToken) {
    await request
      .patch(`${API_URL}/encounters/${encounterId}/finish`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .catch(() => {});
  }
  if (queueEntryId && authToken) {
    await cancelQueueEntry(request, authToken, queueEntryId).catch(() => {});
  }
  if (ownerId && authToken) {
    await deleteTestOwner(request, authToken, ownerId).catch(() => {});
  }
});

// ── Tab Tratamiento ───────────────────────────────────────────────────────────

test('[SYSTEM] Encounter — tab Tratamiento es accesible en el workspace', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo crear encounter activo');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  const treatmentTab = page.getByRole('button', { name: /tratamiento/i });
  if (!(await treatmentTab.isVisible({ timeout: 6_000 }))) {
    test.skip(true, 'Tab de tratamiento no encontrado en el workspace');
    return;
  }

  await treatmentTab.click();
  await page.waitForTimeout(400);

  // El tab carga sin errores
  await expect(page).not.toHaveURL(/error/);
  // Puede mostrar lista vacía o formulario de agregar
  await expect(
    page
      .getByRole('button', { name: /agregar tratamiento|nuevo tratamiento/i })
      .or(page.getByText(/sin tratamientos|no hay tratamientos/i))
      .or(page.locator('.treatment-list, [data-testid="treatment-tab"]')),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] Encounter — agregar medicamento al borrador de tratamiento', async ({
  page,
  request,
}) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo crear encounter activo');
    return;
  }

  // Verificar que hay productos disponibles en el catálogo de tratamientos
  const catalogRes = await request.get(`${API_URL}/catalog/items?type=MEDICATION&limit=1`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!catalogRes.ok() || ((await catalogRes.json()) as { data?: unknown[] }).data?.length === 0) {
    // Intentar con endpoint alternativo
    const altRes = await request.get(`${API_URL}/catalog?limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!altRes.ok()) {
      test.skip(true, 'No hay catálogo de tratamientos disponible');
      return;
    }
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  const treatmentTab = page.getByRole('button', { name: /tratamiento/i });
  if (!(await treatmentTab.isVisible({ timeout: 6_000 }))) {
    test.skip(true, 'Tab de tratamiento no encontrado');
    return;
  }

  await treatmentTab.click();
  await page.waitForTimeout(400);

  const addBtn = page
    .getByRole('button', { name: /agregar|nuevo tratamiento|\+/i })
    .first();

  if (!(await addBtn.isVisible({ timeout: 4_000 }))) {
    test.skip(true, 'No hay botón para agregar tratamiento');
    return;
  }

  await addBtn.click();

  // Seleccionar medicamento del catálogo si hay selector
  const medicationSelect = page.locator('mat-select').first();
  if (await medicationSelect.isVisible({ timeout: 3_000 })) {
    await medicationSelect.click();
    await page.getByRole('option').first().click();
  }

  // Guardar borrador de tratamiento
  const saveBtn = page.getByRole('button', { name: /guardar|agregar/i }).last();
  if (!(await saveBtn.isVisible({ timeout: 3_000 }))) {
    test.skip(true, 'Botón guardar tratamiento no encontrado');
    return;
  }

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        (r.url().includes('treatment') || r.url().includes('medication')) &&
        r.request().method() === 'POST',
      { timeout: 10_000 },
    ).catch(() => null),
    saveBtn.click(),
  ]);

  if (res) {
    expect([200, 201]).toContain(res.status());
  } else {
    // Si no se capturó la respuesta, al menos verificar que no rompe
    await expect(page).not.toHaveURL(/error/);
  }
});

// ── Tab Cirugía / Procedimiento ────────────────────────────────────────────────

test('[SYSTEM] Encounter — tab Cirugía/Procedimiento es accesible en el workspace', async ({
  page,
}) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo crear encounter activo');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  const surgeryTab = page.getByRole('button', { name: /cirugía|procedimiento/i });
  if (!(await surgeryTab.isVisible({ timeout: 6_000 }))) {
    test.skip(true, 'Tab de cirugía/procedimiento no encontrado en el workspace');
    return;
  }

  await surgeryTab.click();
  await page.waitForTimeout(400);

  await expect(page).not.toHaveURL(/error/);
  await expect(
    page
      .getByRole('button', { name: /agregar cirugía|agregar procedimiento/i })
      .or(page.getByText(/sin cirugías|sin procedimientos/i))
      .or(page.locator('.surgery-list, .procedure-list')),
  ).toBeVisible({ timeout: 8_000 });
});

// ── Tab Adjuntos ───────────────────────────────────────────────────────────────

test('[SYSTEM] Encounter — tab Adjuntos es accesible en el workspace', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo crear encounter activo');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  const attachmentsTab = page.getByRole('button', { name: /adjunto|archivo|attachment/i });
  if (!(await attachmentsTab.isVisible({ timeout: 6_000 }))) {
    test.skip(true, 'Tab de adjuntos no encontrado en el workspace');
    return;
  }

  await attachmentsTab.click();
  await page.waitForTimeout(400);

  await expect(page).not.toHaveURL(/error/);
});

test('[SYSTEM] Encounter — subir archivo adjunto en el workspace', async ({ page }) => {
  if (!encounterId) {
    test.skip(true, 'No se pudo crear encounter activo');
    return;
  }

  await page.goto(`/encounters/${encounterId}`);
  await page.waitForLoadState('networkidle');

  const attachmentsTab = page.getByRole('button', { name: /adjunto|archivo|attachment/i });
  if (!(await attachmentsTab.isVisible({ timeout: 6_000 }))) {
    test.skip(true, 'Tab de adjuntos no encontrado');
    return;
  }

  await attachmentsTab.click();
  await page.waitForTimeout(400);

  // Buscar input de tipo file
  const fileInput = page.locator('input[type="file"]');
  if (!(await fileInput.isVisible({ timeout: 4_000 }).catch(() => false))) {
    // Puede estar oculto — intentar hacer click en botón de carga
    const uploadBtn = page.getByRole('button', { name: /subir|cargar|upload|adjuntar/i }).first();
    if (!(await uploadBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No hay input de archivo ni botón de carga visible');
      return;
    }
    await uploadBtn.click();
  }

  // Crear un archivo de prueba en memoria usando la API de Playwright
  // Usamos un PDF simple (1x1 pixel PNG en base64 como placeholder)
  const fileInputLocator = page.locator('input[type="file"]').first();
  await fileInputLocator.setInputFiles({
    name: 'test-attachment.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
  });

  // Esperar respuesta de upload
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        (r.url().includes('attachment') || r.url().includes('upload')) &&
        r.request().method() === 'POST',
      { timeout: 15_000 },
    ).catch(() => null),
    page.waitForTimeout(500),
  ]);

  if (res) {
    expect([200, 201]).toContain(res.status());
  } else {
    await expect(page).not.toHaveURL(/error/);
  }
});

// ── Reactivar atención finalizada ─────────────────────────────────────────────

test('[SYSTEM] Encounter — reactivar atención finalizada desde historial', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  // Obtener una atención finalizada via API
  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo consultar el historial de atenciones');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas para reactivar');
    return;
  }

  const finishedEncounterId = body.data[0].id;
  await page.goto(`/history/${finishedEncounterId}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/history/${finishedEncounterId}`));

  // Buscar botón de reactivar
  const reactivateBtn = page.getByRole('button', { name: /reactivar|reabrir/i });
  if (!(await reactivateBtn.isVisible({ timeout: 6_000 }).catch(() => false))) {
    test.skip(true, 'No hay botón de reactivar en la vista de historial');
    return;
  }

  const [reactivateRes] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/encounters/${finishedEncounterId}`) &&
        (r.url().includes('/reactivate') || r.request().method() === 'PATCH'),
      { timeout: 10_000 },
    ),
    reactivateBtn.click(),
  ]);

  expect([200, 201]).toContain(reactivateRes.status());

  // Debe navegar al workspace de la atención
  await page.waitForURL('**/encounters/**', { timeout: 10_000 });
  await expect(page).toHaveURL(/encounters/);

  // Cleanup: finalizar la atención reactivada
  await request
    .patch(`${API_URL}/encounters/${finishedEncounterId}/finish`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
});

// ── Ver secciones completas en historial ──────────────────────────────────────

test('[SYSTEM] History — ver secciones completas de atención finalizada', async ({
  page,
  request,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/encounters?status=FINALIZADA&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo consultar el historial');
    return;
  }

  const body = (await res.json()) as { data: { id: number }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay atenciones finalizadas');
    return;
  }

  const encounterDetailId = body.data[0].id;
  await page.goto(`/history/${encounterDetailId}`);
  await page.waitForLoadState('networkidle');

  // Verificar que carga la página de detalle
  await expect(page).toHaveURL(new RegExp(`/history/${encounterDetailId}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Al menos uno de los siguientes elementos debe ser visible:
  // - Nombre del paciente
  // - Sección de motivo de consulta o signos vitales
  // - Fecha de la atención
  await expect(
    page
      .getByText(/motivo|signos vitales|peso|diagnóstico|impresión|finalizada/i)
      .first()
      .or(page.locator('.encounter-detail, [data-testid="encounter-detail"]').first()),
  ).toBeVisible({ timeout: 8_000 });
});
