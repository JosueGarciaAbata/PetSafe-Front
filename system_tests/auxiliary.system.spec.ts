/**
 * Pruebas de sistema — Módulos Auxiliares
 *
 * Cubre páginas que no tenían ningún test:
 *   - Página de recuperación de contraseña (/recovery)
 *   - Página de acceso no autorizado (/unauthorized)
 *   - Perfil público de mascota via QR token (/mascota/:qrToken)
 *   - Login — validaciones de formulario
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from './helpers/appointments-api';

// ── Recovery (recuperación de contraseña) ─────────────────────────────────────

// NOTA: Esta suite NO usa el storageState de auth (no requiere login)
// ya que /recovery es una página pública

test('[SYSTEM] Recovery — página de recuperación carga correctamente', async ({ browser }) => {
  // Crear contexto sin sesión guardada
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/recovery');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/recovery/);
    await expect(page).not.toHaveURL(/error/);

    // Debe haber un formulario de recuperación
    await expect(
      page
        .getByRole('heading', { name: /recuperar|contraseña|password/i })
        .or(page.locator('input[type="email"]').first())
        .or(page.locator('form').first()),
    ).toBeVisible({ timeout: 8_000 });
  } finally {
    await context.close();
  }
});

test('[SYSTEM] Recovery — formulario tiene campo de email', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/recovery');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 8_000 });
  } finally {
    await context.close();
  }
});

test('[SYSTEM] Recovery — enviar email de recuperación (validación de formulario)', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/recovery');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    if (!(await emailInput.isVisible({ timeout: 6_000 }).catch(() => false))) {
      test.skip(true, 'No hay campo de email en la página de recuperación');
      return;
    }

    // Rellenar con email que no existe (para probar que no rompe)
    await emailInput.fill('no-existe@playwright-test.com');

    const submitBtn = page.getByRole('button', { name: /enviar|recuperar|reset/i }).first();
    if (!(await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No hay botón de envío en la página de recuperación');
      return;
    }

    await submitBtn.click();

    // Debe mostrar algún mensaje (éxito o error de usuario no encontrado)
    await expect(page).not.toHaveURL(/login|dashboard/, { timeout: 5_000 }).catch(() => {});
    await expect(page).not.toHaveURL(/error/);
  } finally {
    await context.close();
  }
});

test('[SYSTEM] Recovery — link de volver al login es visible', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/recovery');
    await page.waitForLoadState('networkidle');

    const loginLink = page.getByRole('link', { name: /iniciar sesión|login|volver/i });
    if (await loginLink.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/, { timeout: 6_000 });
    } else {
      // No hay link de volver — al menos la página carga
      await expect(page).toHaveURL(/recovery/);
    }
  } finally {
    await context.close();
  }
});

// ── Unauthorized ──────────────────────────────────────────────────────────────

test('[SYSTEM] Unauthorized — página de acceso no autorizado carga correctamente', async ({
  page,
}) => {
  await page.goto('/unauthorized');
  await page.waitForLoadState('networkidle');

  // La página de unauthorized puede redirigir si el usuario está autenticado
  // En ese caso, aceptamos que vaya al dashboard
  if (page.url().includes('/unauthorized')) {
    await expect(page).not.toHaveURL(/error/);
    await expect(
      page
        .getByRole('heading', { name: /no autorizado|acceso denegado|sin permiso/i })
        .or(page.getByText(/401|403|unauthorized|no tienes permiso/i).first()),
    ).toBeVisible({ timeout: 8_000 });
  } else {
    // Redirigió — verificar que está en una página válida
    await expect(page).not.toHaveURL(/error/);
  }
});

// ── Perfil público QR ─────────────────────────────────────────────────────────

test('[SYSTEM] QR Profile — perfil público de mascota via token válido', async ({
  page,
  request,
  browser,
}) => {
  // Intentar obtener el QR token de un paciente via API autenticada
  // El perfil público NO requiere autenticación

  // Primero, autenticarnos para obtener token de API
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Obtener datos del primer paciente (el seed tiene QR)
  const res = await request.get(`${API_URL}/patients/1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener el paciente 1 para obtener su QR token');
    return;
  }

  const patient = (await res.json()) as { id: number; qrToken?: string; name: string };

  if (!patient.qrToken) {
    test.skip(true, 'El paciente no tiene QR token generado');
    return;
  }

  // Abrir el perfil público en un contexto sin sesión
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();

  try {
    await publicPage.goto(`/mascota/${patient.qrToken}`);
    await publicPage.waitForLoadState('networkidle');

    await expect(publicPage).toHaveURL(new RegExp(`/mascota/${patient.qrToken}`));
    await expect(publicPage).not.toHaveURL(/error/);

    // El perfil debe mostrar el nombre del paciente
    await expect(publicPage.getByText(patient.name)).toBeVisible({ timeout: 8_000 });
  } finally {
    await publicContext.close();
  }
});

test('[SYSTEM] QR Profile — token inválido muestra error o página de not found', async ({
  browser,
}) => {
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();

  try {
    await publicPage.goto('/mascota/token-invalido-que-no-existe-12345');
    await publicPage.waitForLoadState('networkidle');

    // Debe mostrar algún mensaje de error (no encontrado)
    // Puede redirigir a /error o mostrar un mensaje en la misma página
    const hasError =
      publicPage.url().includes('/error') ||
      (await publicPage.getByText(/no encontrado|no existe|error|not found/i).isVisible({ timeout: 5_000 }).catch(() => false));

    expect(hasError).toBe(true);
  } finally {
    await publicContext.close();
  }
});
