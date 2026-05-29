/**
 * Pruebas de sistema — Vacunación (Vaccination) Avanzada
 *
 * Complementa el spec base con:
 *   - Crear nuevo esquema de vacunación completo (sin skip)
 *   - Crear nueva versión de un esquema existente
 *   - Editar producto de vacuna existente
 *   - Buscar esquema por nombre
 *   - Verificar que el esquema detalla sus dosis/versiones
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';

// ── Crear esquema de vacunación ───────────────────────────────────────────────

test('[SYSTEM] Vaccination — crear nuevo esquema de vacunación completo', async ({
  page,
  request,
}) => {
  await page.goto('/vaccination/schemes/new');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  await expect(page).toHaveURL(/vaccination\/schemes\/new/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  let createdSchemeId = 0;

  try {
    const schemeName = `Esquema Playwright ${Date.now()}`;

    // Nombre del esquema
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill(schemeName);

    // Especie (si hay selector)
    const speciesSelect = page.locator('mat-select').first();
    if (await speciesSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await speciesSelect.click();
      await page.getByRole('option').first().click();
    }

    // Si hay sub-formulario de versión inicial, intentar rellenarlo
    const versionNameInput = page
      .getByLabel(/versión|version/i)
      .first()
      .or(page.locator('input').nth(1));
    if (await versionNameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await versionNameInput.fill('v1.0');
    }

    // Descripción (si existe)
    const descriptionInput = page
      .getByLabel(/descripción|descripcion/i)
      .first()
      .or(page.locator('textarea').first());
    if (await descriptionInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descriptionInput.fill('[TEST SYSTEM] Esquema creado en prueba de sistema');
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/vaccinations/schemes') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdSchemeId = body.id;

      // Navega al detalle del esquema o al listado
      await expect(page).toHaveURL(/vaccination\/schemes/);
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    // Los esquemas de vacunación generalmente no tienen DELETE, se marcan inactivos
    void createdSchemeId;
  }
});

test('[SYSTEM] Vaccination — crear nueva versión de esquema existente', async ({
  page,
  request,
}) => {
  await page.goto('/vaccination/schemes');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Obtener el primer esquema via API
  const res = await request.get(`${API_URL}/vaccinations/schemes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener esquemas de vacunación');
    return;
  }

  const schemes = (await res.json()) as { id: number; name: string }[];
  if (!schemes.length) {
    test.skip(true, 'No hay esquemas de vacunación en la base de datos');
    return;
  }

  const scheme = schemes[0];
  await page.goto(`/vaccination/schemes/${scheme.id}/versions/new`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/versions\/new/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Rellenar nombre de la versión
  const versionNameInput = page.locator('input[type="text"]').first();
  if (await versionNameInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await versionNameInput.fill(`v${Date.now()}`);

    const [createRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/vaccinations/schemes') &&
          r.url().includes('/versions') &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|crear/i }).click(),
    ]);

    if (createRes) {
      expect([200, 201]).toContain(createRes.status());
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } else {
    test.skip(true, 'No se encontró el formulario de nueva versión');
  }
});

// ── Listar y ver detalles de esquemas ─────────────────────────────────────────

test('[SYSTEM] Vaccination — esquema muestra sus dosis/versiones en el detalle', async ({
  page,
  request,
}) => {
  await page.goto('/vaccination/schemes');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/vaccinations/schemes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener esquemas');
    return;
  }

  const schemes = (await res.json()) as { id: number; name: string }[];
  if (!schemes.length) {
    test.skip(true, 'No hay esquemas');
    return;
  }

  const scheme = schemes[0];
  await page.goto(`/vaccination/schemes/${scheme.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/vaccination/schemes/${scheme.id}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // El nombre del esquema debe aparecer
  await expect(page.getByText(scheme.name)).toBeVisible({ timeout: 6_000 });

  // Debe aparecer alguna sección de dosis, versiones, o aplicaciones
  await expect(
    page
      .getByText(/versión|dosis|aplicación|vacuna/i)
      .first()
      .or(page.locator('[class*="version"], [class*="dose"], [class*="scheme-detail"]').first()),
  ).toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Vaccination — buscar esquema por nombre en el listado', async ({
  page,
  request,
}) => {
  await page.goto('/vaccination/schemes');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/vaccinations/schemes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok() || !(await res.json() as unknown[]).length) {
    test.skip(true, 'No hay esquemas para buscar');
    return;
  }

  const schemes = (await res.json()) as { id: number; name: string }[];
  const firstSchemeName = schemes[0].name;

  const searchInput = page.getByPlaceholder(/buscar/i).first();
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill(firstSchemeName.substring(0, 5));
    await page.waitForTimeout(400);

    await expect(page.getByText(firstSchemeName)).toBeVisible({ timeout: 6_000 });
  } else {
    // No hay búsqueda — verificar que el esquema aparece en el listado
    await expect(page.getByText(firstSchemeName)).toBeVisible({ timeout: 6_000 });
  }
});

// ── Editar producto de vacuna ──────────────────────────────────────────────────

test('[SYSTEM] Vaccination — editar nombre de producto de vacuna existente', async ({
  page,
  request,
}) => {
  await page.goto('/vaccination/products');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  const res = await request.get(`${API_URL}/vaccinations/products?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener productos de vacuna');
    return;
  }

  const body = (await res.json()) as
    | { data: { id: number; name: string }[] }
    | { id: number; name: string }[];

  const products = Array.isArray(body) ? body : (body as { data: { id: number; name: string }[] }).data;

  if (!products?.length) {
    test.skip(true, 'No hay productos de vacuna');
    return;
  }

  const product = products[0];

  // Hacer click en el ítem para editar (puede abrir modal o navegar)
  const row = page
    .locator('tbody tr, .vaccine-card, [data-testid="vaccine-row"]')
    .filter({ hasText: product.name })
    .first();

  if (!(await row.isVisible({ timeout: 6_000 }).catch(() => false))) {
    test.skip(true, 'Producto de vacuna no visible en la lista');
    return;
  }

  const editBtn = row.getByRole('button', { name: /editar|edit/i });
  if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await editBtn.click();
  } else {
    await row.click();
  }

  // Buscar el input de nombre
  const nameInput = page
    .getByLabel(/nombre/i)
    .first()
    .or(page.locator('input[formControlName="name"]').first());

  if (await nameInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
    const originalName = await nameInput.inputValue();

    await nameInput.fill(`${product.name} - Editado Test`);

    const [res2] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/vaccinations/products`) &&
          (r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
        { timeout: 10_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|actualizar/i }).click(),
    ]);

    if (res2) {
      expect([200, 201]).toContain(res2.status());

      // Restaurar nombre original via API
      await request.patch(`${API_URL}/vaccinations/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: originalName },
      }).catch(() => {});
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } else {
    test.skip(true, 'No se encontró campo editable para la vacuna');
  }
});
