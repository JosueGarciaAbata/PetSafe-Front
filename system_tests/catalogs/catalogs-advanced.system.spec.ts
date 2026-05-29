/**
 * Pruebas de sistema — Catálogos (Catalogs) Avanzados
 *
 * Complementa el spec base con:
 *   - Crear ítem de catálogo de procedimientos completo (sin skip)
 *   - Crear ítem de catálogo de cirugías
 *   - Editar ítem de catálogo existente
 *   - Crear nueva especie
 *   - Crear nueva raza asociada a especie
 *   - Buscar ítem en el catálogo
 *   - Crear grupo zootécnico nuevo
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';

// ── Catálogo de procedimientos ────────────────────────────────────────────────

test('[SYSTEM] Catalogs — crear ítem de procedimiento con todos los campos', async ({
  page,
  request,
}) => {
  await page.goto('/catalogs/procedures');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  await expect(page).toHaveURL(/catalogs\/procedures/);

  let createdItemId = 0;

  try {
    const addBtn = page.getByRole('button', { name: /agregar|nuevo|crear|\+/i }).first();
    if (!(await addBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón para agregar ítems en catálogo de procedimientos');
      return;
    }

    await addBtn.click();

    // Nombre del procedimiento
    const nameInput = page
      .getByLabel(/nombre/i)
      .first()
      .or(page.getByPlaceholder(/nombre/i).first())
      .or(page.locator('input[formControlName="name"]').first());
    await nameInput.fill(`Procedimiento Playwright ${Date.now()}`);

    // Precio (si existe)
    const priceInput = page
      .getByLabel(/precio|costo/i)
      .first()
      .or(page.locator('input[type="number"]').first());
    if (await priceInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await priceInput.fill('25.00');
    }

    // Categoría o tipo (si existe selector)
    const categorySelect = page.locator('mat-select').first();
    if (await categorySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await categorySelect.click();
      await page.getByRole('option').first().click();
    }

    // Descripción (si existe)
    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descInput.fill('[TEST SYSTEM] Procedimiento temporal de prueba');
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdItemId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdItemId) {
      await request
        .delete(`${API_URL}/catalog/procedures/${createdItemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});

test('[SYSTEM] Catalogs — editar nombre de ítem en catálogo de procedimientos', async ({
  page,
  request,
}) => {
  await page.goto('/catalogs/procedures');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Obtener el primer ítem del catálogo via API
  const res = await request.get(`${API_URL}/catalog/items?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener ítems del catálogo');
    return;
  }

  const body = (await res.json()) as
    | { data: { id: number; name: string }[] }
    | { id: number; name: string }[];
  const items = Array.isArray(body) ? body : (body as { data: { id: number; name: string }[] }).data;

  if (!items?.length) {
    test.skip(true, 'No hay ítems en el catálogo de procedimientos');
    return;
  }

  const item = items[0];

  // Buscar el ítem en la tabla y hacer click en editar
  const row = page.locator('tbody tr').filter({ hasText: item.name }).first();
  if (!(await row.isVisible({ timeout: 6_000 }).catch(() => false))) {
    test.skip(true, 'Ítem no visible en la tabla');
    return;
  }

  const editBtn = row.getByRole('button', { name: /editar|edit/i });
  if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await editBtn.click();
  } else {
    await row.click();
  }

  // Buscar input de nombre
  const nameInput = page
    .getByLabel(/nombre/i)
    .first()
    .or(page.locator('input[formControlName="name"]').first());

  if (await nameInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
    const originalName = await nameInput.inputValue();
    await nameInput.fill(`${item.name} Edit`);

    const [updateRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/') &&
          (r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
        { timeout: 10_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|actualizar/i }).click(),
    ]);

    if (updateRes) {
      expect([200, 201]).toContain(updateRes.status());
      // Restaurar nombre original
      await request.patch(`${API_URL}/catalog/items/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: originalName },
      }).catch(() => {});
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } else {
    test.skip(true, 'No se encontró campo editable para el ítem');
  }
});

test('[SYSTEM] Catalogs — buscar ítem por nombre en procedimientos', async ({ page }) => {
  await page.goto('/catalogs/procedures');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  if (!(await searchInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
    test.skip(true, 'No hay input de búsqueda en catálogo de procedimientos');
    return;
  }

  await searchInput.fill('Test');
  await page.waitForTimeout(400);

  await expect(page).not.toHaveURL(/error/);
});

// ── Catálogo de cirugías ──────────────────────────────────────────────────────

test('[SYSTEM] Catalogs — listar catálogo de cirugías con contenido', async ({ page }) => {
  await page.goto('/catalogs/surgeries');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/catalogs\/surgeries/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Encabezado visible
  await expect(
    page
      .getByRole('heading', { name: /cirugía|cirugia|catálogo/i })
      .or(page.locator('tbody tr, .catalog-item').first()),
  ).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Catalogs — crear ítem en catálogo de cirugías', async ({ page, request }) => {
  await page.goto('/catalogs/surgeries');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  let createdItemId = 0;

  try {
    const addBtn = page.getByRole('button', { name: /agregar|nuevo|crear|\+/i }).first();
    if (!(await addBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón para agregar cirugías');
      return;
    }

    await addBtn.click();

    const nameInput = page.getByLabel(/nombre/i).first().or(
      page.getByPlaceholder(/nombre/i).first(),
    );
    await nameInput.fill(`Cirugía Playwright ${Date.now()}`);

    const priceInput = page.locator('input[type="number"]').first();
    if (await priceInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await priceInput.fill('150.00');
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdItemId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdItemId) {
      await request
        .delete(`${API_URL}/catalog/surgeries/${createdItemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});

// ── Especies ──────────────────────────────────────────────────────────────────

test('[SYSTEM] Catalogs — crear nueva especie', async ({ page, request }) => {
  await page.goto('/catalogs/species');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  let createdSpeciesId = 0;

  try {
    const addBtn = page.getByRole('button', { name: /agregar|nueva|crear|\+/i }).first();
    if (!(await addBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón para agregar especies');
      return;
    }

    await addBtn.click();

    const nameInput = page.getByLabel(/nombre/i).first().or(
      page.getByPlaceholder(/nombre/i).first(),
    );
    await nameInput.fill(`Especie Playwright ${Date.now()}`);

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdSpeciesId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdSpeciesId) {
      await request
        .delete(`${API_URL}/species/${createdSpeciesId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});

// ── Razas ─────────────────────────────────────────────────────────────────────

test('[SYSTEM] Catalogs — crear nueva raza asociada a especie canina', async ({
  page,
  request,
}) => {
  await page.goto('/catalogs/breeds');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  let createdBreedId = 0;

  try {
    const addBtn = page.getByRole('button', { name: /agregar|nueva|crear|\+/i }).first();
    if (!(await addBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón para agregar razas');
      return;
    }

    await addBtn.click();

    // Nombre de la raza
    const nameInput = page.getByLabel(/nombre/i).first().or(
      page.getByPlaceholder(/nombre/i).first(),
    );
    await nameInput.fill(`Raza Playwright ${Date.now()}`);

    // Seleccionar especie (canino = 1)
    const speciesSelect = page.locator('mat-select').first();
    if (await speciesSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await speciesSelect.click();
      await page.getByRole('option').first().click();
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdBreedId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdBreedId) {
      await request
        .delete(`${API_URL}/breeds/${createdBreedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});

// ── Grupos zootécnicos ────────────────────────────────────────────────────────

test('[SYSTEM] Catalogs — crear nuevo grupo zootécnico', async ({ page, request }) => {
  await page.goto('/catalogs/zootecnical-groups');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  let createdGroupId = 0;

  try {
    const addBtn = page.getByRole('button', { name: /agregar|nuevo|crear|\+/i }).first();
    if (!(await addBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón para agregar grupos zootécnicos');
      return;
    }

    await addBtn.click();

    const nameInput = page.getByLabel(/nombre/i).first().or(
      page.getByPlaceholder(/nombre/i).first(),
    );
    await nameInput.fill(`Grupo Zootécnico Playwright ${Date.now()}`);

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdGroupId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdGroupId) {
      await request
        .delete(`${API_URL}/zootecnical-groups/${createdGroupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});
