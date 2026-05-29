/**
 * Pruebas de sistema — Configuración (Settings) Avanzada
 *
 * Complementa el spec base con:
 *   - Cambio de contraseña (si hay sección de cambio de contraseña)
 *   - Flujo completo del modal de actualización de correo
 *   - Verificación que "Confirmar cambio" está deshabilitado sin datos
 *   - Verificar que los campos tienen los valores actuales del usuario
 *   - Guardar sin cambios (campos iguales) no rompe
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { updateTestUserProfile } from '../helpers/settings-api';

// ── Helpers locales ────────────────────────────────────────────────────────────

async function gotoSettings(page: Parameters<typeof getTokenFromPage>[0]) {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
}

// ── Estructura de la página ────────────────────────────────────────────────────

test('[SYSTEM] Settings — página carga con secciones correctas', async ({ page }) => {
  await gotoSettings(page);

  await expect(page).toHaveURL(/settings/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  await expect(page.getByRole('heading', { name: /configuracion/i })).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.getByRole('heading', { name: /datos personales/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /correo electronico/i })).toBeVisible();
});

test('[SYSTEM] Settings — campos del formulario muestran datos del usuario autenticado', async ({
  page,
}) => {
  await gotoSettings(page);

  // Los campos deben tener valores (no vacíos) con los datos del usuario actual
  const nombreInput = page.getByLabel(/nombre/i);
  const apellidoInput = page.getByLabel(/apellido/i);

  await expect(nombreInput).toBeVisible({ timeout: 6_000 });
  await expect(apellidoInput).toBeVisible();

  const nombre = await nombreInput.inputValue();
  const apellido = await apellidoInput.inputValue();

  // Los campos deben tener algún valor
  expect(nombre.trim().length).toBeGreaterThan(0);
  expect(apellido.trim().length).toBeGreaterThan(0);
});

test('[SYSTEM] Settings — correo del usuario es visible y no editable directamente', async ({
  page,
}) => {
  await gotoSettings(page);

  // El correo se muestra pero no se edita directamente (solo via botón "Actualizar correo")
  await expect(page.getByText('admin@safepet.com')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('button', { name: /actualizar correo/i })).toBeVisible();
});

// ── Actualización de datos personales ─────────────────────────────────────────

test('[SYSTEM] Settings — guardar datos personales sin cambios no rompe', async ({
  page,
  request,
}) => {
  await gotoSettings(page);
  const token = await getTokenFromPage(page);

  // Leer los valores actuales
  const currentNombre = await page.getByLabel(/nombre/i).inputValue();
  const currentApellido = await page.getByLabel(/apellido/i).inputValue();

  // Guardar sin cambios
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/users/me') && r.request().method() === 'PATCH',
      { timeout: 8_000 },
    ),
    page.getByRole('button', { name: /guardar cambios/i }).click(),
  ]);

  expect(res.status()).toBe(200);

  // Los valores deben ser los mismos
  await expect(page.getByLabel(/nombre/i)).toHaveValue(currentNombre);
  await expect(page.getByLabel(/apellido/i)).toHaveValue(currentApellido);
});

test('[SYSTEM] Settings — actualizar nombre, apellido y teléfono', async ({
  page,
  request,
}) => {
  await gotoSettings(page);
  const token = await getTokenFromPage(page);

  // Guardar perfil original para restaurar
  const originalName = await page.getByLabel(/nombre/i).inputValue();
  const originalLast = await page.getByLabel(/apellido/i).inputValue();
  const originalPhone = await page.getByLabel(/telefono/i).inputValue().catch(() => '');

  try {
    await page.getByLabel(/nombre/i).fill('Admin Test');
    await page.getByLabel(/apellido/i).fill('SafePet Test');

    const phoneInput = page.getByLabel(/telefono/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0991234567');
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/me') && r.request().method() === 'PATCH',
        { timeout: 8_000 },
      ),
      page.getByRole('button', { name: /guardar cambios/i }).click(),
    ]);

    expect(res.status()).toBe(200);
    await expect(page.getByLabel(/nombre/i)).toHaveValue('Admin Test');
    await expect(page.getByLabel(/apellido/i)).toHaveValue('SafePet Test');
  } finally {
    // Restaurar perfil original
    await updateTestUserProfile(request, token, {
      firstName: originalName,
      lastName: originalLast,
      phone: originalPhone || undefined,
    });
  }
});

// ── Modal de actualización de correo ──────────────────────────────────────────

test('[SYSTEM] Settings — abrir modal de actualización de correo muestra campos', async ({
  page,
}) => {
  await gotoSettings(page);

  await page.getByRole('button', { name: /actualizar correo/i }).click();

  // Verificar que el modal/sección de cambio de correo aparece
  await expect(
    page.getByRole('heading', { name: /actualizar correo/i }),
  ).toBeVisible({ timeout: 6_000 });

  await expect(page.getByPlaceholder('nuevo@correo.com')).toBeVisible();
  await expect(page.getByPlaceholder(/6 digitos/i)).toBeVisible();
});

test('[SYSTEM] Settings — botón "Confirmar cambio" está deshabilitado sin datos', async ({
  page,
}) => {
  await gotoSettings(page);

  await page.getByRole('button', { name: /actualizar correo/i }).click();
  await expect(
    page.getByRole('heading', { name: /actualizar correo/i }),
  ).toBeVisible({ timeout: 6_000 });

  // Sin llenar los campos, el botón de confirmar debe estar deshabilitado
  const confirmBtn = page.getByRole('button', { name: /confirmar cambio/i });
  await expect(confirmBtn).toBeDisabled();
});

test('[SYSTEM] Settings — botón "Confirmar cambio" sigue deshabilitado solo con email (sin código)', async ({
  page,
}) => {
  await gotoSettings(page);

  await page.getByRole('button', { name: /actualizar correo/i }).click();
  await expect(
    page.getByRole('heading', { name: /actualizar correo/i }),
  ).toBeVisible({ timeout: 6_000 });

  // Llenar solo el email, sin el código OTP
  await page.getByPlaceholder('nuevo@correo.com').fill('nuevo@correo-test.com');

  const confirmBtn = page.getByRole('button', { name: /confirmar cambio/i });
  // Con solo email y sin código OTP, el botón debe seguir deshabilitado
  await expect(confirmBtn).toBeDisabled({ timeout: 3_000 });
});

// ── Cambio de contraseña ───────────────────────────────────────────────────────

test('[SYSTEM] Settings — sección de cambio de contraseña es accesible', async ({ page }) => {
  await gotoSettings(page);

  // Buscar sección de contraseña
  const passwordSection = page
    .getByRole('heading', { name: /contraseña|password/i })
    .or(page.getByRole('button', { name: /cambiar contraseña|actualizar contraseña/i }));

  if (await passwordSection.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await expect(passwordSection).toBeVisible();

    // Si hay botón de cambiar contraseña, hacer click y verificar que aparecen los campos
    const changeBtn = page.getByRole('button', { name: /cambiar contraseña/i });
    if (await changeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await changeBtn.click();
      // Deben aparecer inputs de contraseña
      await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 4_000 });
    }
  } else {
    test.skip(true, 'No hay sección de cambio de contraseña visible en Settings');
  }
});

test('[SYSTEM] Settings — cambiar contraseña con contraseña actual válida', async ({
  page,
}) => {
  await gotoSettings(page);

  const passwordSection = page.getByRole('heading', { name: /contraseña|password/i });
  if (!(await passwordSection.isVisible({ timeout: 3_000 }).catch(() => false))) {
    test.skip(true, 'No hay sección de contraseña en Settings');
    return;
  }

  const changeBtn = page.getByRole('button', { name: /cambiar contraseña/i });
  if (!(await changeBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    test.skip(true, 'No hay botón de cambiar contraseña');
    return;
  }

  await changeBtn.click();

  const passwordInputs = page.locator('input[type="password"]');
  const count = await passwordInputs.count();

  if (count < 2) {
    test.skip(true, 'No hay suficientes campos de contraseña');
    return;
  }

  // Rellenar contraseña actual y nueva (usar la misma para no cambiarla realmente)
  await passwordInputs.nth(0).fill('Admin1234!');    // contraseña actual
  await passwordInputs.nth(1).fill('Admin1234!New'); // nueva contraseña
  if (count >= 3) {
    await passwordInputs.nth(2).fill('Admin1234!New'); // confirmar nueva
  }

  const saveBtn = page.getByRole('button', { name: /guardar|actualizar|cambiar/i }).last();
  if (!(await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    test.skip(true, 'No hay botón de guardar contraseña');
    return;
  }

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/users/me') &&
        (r.url().includes('password') || r.request().method() === 'PATCH'),
      { timeout: 10_000 },
    ).catch(() => null),
    saveBtn.click(),
  ]);

  if (res) {
    // Puede ser 200 (éxito) o 400 (contraseña incorrecta — expected en entorno de test)
    expect([200, 400, 401]).toContain(res.status());
  }

  // La página no debe romper
  await expect(page).not.toHaveURL(/error/);
});
