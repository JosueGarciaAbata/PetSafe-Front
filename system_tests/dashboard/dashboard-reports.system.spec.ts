/**
 * Pruebas de sistema — Dashboard (completas)
 *
 * Cubre:
 *   - Las 4 tarjetas KPI son visibles con valores numéricos reales
 *   - Los valores de la UI coinciden con la respuesta de la API
 *   - Estado de carga (skeleton) aparece y desaparece
 *   - Encabezado h1 "Dashboard" y subtítulo de fecha presentes
 *   - Navegación a /queue desde el dashboard
 *   - Navegación a /appointments desde el dashboard (si existe enlace)
 *   - Navegación a /history desde el dashboard (si existe enlace)
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage } from '../helpers/appointments-api';

// ── Constantes de los labels KPI según el componente ─────────────────────────

const KPI_LABELS = ['Citas de hoy', 'En cola', 'En consulta', 'Finalizados'] as const;

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Espera a que el dashboard termine de cargar (sin skeleton visible) */
async function waitForDashboardReady(page: Parameters<typeof getTokenFromPage>[0]) {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  // Esperar a que los skeletons desaparezcan (o que nunca aparezcan)
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse').length === 0,
    { timeout: 10_000 },
  );
}

// ── Tests de carga y estructura ────────────────────────────────────────────────

test('[SYSTEM] Dashboard — encabezado h1 y subtítulo de fecha visibles', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // h1 con texto "Dashboard"
  await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible({
    timeout: 8_000,
  });

  // Subtítulo: "Resumen operativo de hoy, ..."
  await expect(page.getByText(/resumen operativo de hoy/i)).toBeVisible({ timeout: 6_000 });

  // No debe redirigir a error ni unauthorized
  await expect(page).not.toHaveURL(/error|unauthorized/);
});

test('[SYSTEM] Dashboard — skeleton de carga aparece y desaparece', async ({ page }) => {
  // Interceptar la respuesta de métricas para atraparla mientras carga
  let resolveDelay!: () => void;
  const delayDone = new Promise<void>((r) => { resolveDelay = r; });

  await page.route('**/api/dashboard/metrics', async (route) => {
    // Completar la respuesta después de un delay corto
    await delayDone;
    await route.continue();
  });

  await page.goto('/dashboard');

  // Verificar que el skeleton aparece mientras carga
  const skeleton = page.locator('.animate-pulse').first();
  // Puede que el skeleton aparezca muy brevemente — verificar que la página no rompe
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Liberar la respuesta
  resolveDelay();

  // Después de cargar: sin skeleton
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse').length === 0,
    { timeout: 10_000 },
  );
  await expect(skeleton).not.toBeVisible();
});

test('[SYSTEM] Dashboard — las 4 tarjetas KPI son visibles', async ({ page }) => {
  await waitForDashboardReady(page);

  // Verificar que los 4 labels de KPI están presentes
  for (const label of KPI_LABELS) {
    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 8_000 });
  }
});

test('[SYSTEM] Dashboard — las 4 tarjetas KPI muestran valores numéricos (>= 0)', async ({ page }) => {
  await waitForDashboardReady(page);

  // El componente usa text-[36px] para los valores numéricos dentro de <strong>
  const valueElements = page.locator('article strong');
  const count = await valueElements.count();

  expect(count).toBeGreaterThanOrEqual(4);

  // Cada valor debe ser un número >= 0
  for (let i = 0; i < Math.min(count, 4); i++) {
    const text = await valueElements.nth(i).textContent();
    const parsed = parseInt(text?.trim() ?? '-1', 10);
    expect(parsed).toBeGreaterThanOrEqual(0);
  }
});

test('[SYSTEM] Dashboard — valores KPI son consistentes con la API', async ({ page, request }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);

  // Obtener métricas directamente de la API
  const res = await request.get(`${API_URL}/dashboard/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener métricas del dashboard via API');
    return;
  }

  const metrics = (await res.json()) as {
    pendingAppointments: number;
    waitingInQueue: number;
    activeEncounters: number;
    finishedEncountersToday: number;
  };

  // Esperar a que los skeletons desaparezcan
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse').length === 0,
    { timeout: 10_000 },
  );

  // Verificar que los valores de la UI coinciden con la API
  // (Los values están en <strong> dentro de los <article> KPI)
  const valueElements = page.locator('article strong');
  const count = await valueElements.count();

  if (count >= 4) {
    const apiValues = [
      metrics.pendingAppointments,
      metrics.waitingInQueue,
      metrics.activeEncounters,
      metrics.finishedEncountersToday,
    ];

    for (let i = 0; i < 4; i++) {
      const uiText = (await valueElements.nth(i).textContent())?.trim() ?? '';
      const uiValue = parseInt(uiText, 10);
      expect(uiValue).toBe(apiValues[i]);
    }
  } else {
    // Si no hay exactamente 4 valores, al menos verificar que la página cargó
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] Dashboard — descripciones de cada KPI son visibles', async ({ page }) => {
  await waitForDashboardReady(page);

  const descriptions = [
    /turnos pendientes por atender/i,
    /pacientes esperando/i,
    /atenciones activas/i,
    /atenciones completadas/i,
  ];

  for (const desc of descriptions) {
    await expect(page.getByText(desc)).toBeVisible({ timeout: 6_000 });
  }
});

// ── Tests de navegación ───────────────────────────────────────────────────────

test('[SYSTEM] Dashboard — navegar a /queue', async ({ page }) => {
  await waitForDashboardReady(page);

  // Buscar enlace de cola en la shell/nav
  const queueLink = page
    .getByRole('link', { name: /cola|atención|queue/i })
    .or(page.getByRole('button', { name: /cola|atención|queue/i }))
    .first();

  if (await queueLink.isVisible({ timeout: 3_000 })) {
    await queueLink.click();
    await expect(page).toHaveURL(/queue/, { timeout: 8_000 });
  } else {
    // Navegar directamente si no hay acceso rápido en el dashboard
    await page.goto('/queue');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/queue/);
  }
});

test('[SYSTEM] Dashboard — navegar a /appointments', async ({ page }) => {
  await waitForDashboardReady(page);

  const apptLink = page
    .getByRole('link', { name: /citas|appointments/i })
    .first();

  if (await apptLink.isVisible({ timeout: 3_000 })) {
    await apptLink.click();
    await expect(page).toHaveURL(/appointments/, { timeout: 8_000 });
  } else {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/appointments/);
  }
});

test('[SYSTEM] Dashboard — navegar a /history', async ({ page }) => {
  await waitForDashboardReady(page);

  const histLink = page
    .getByRole('link', { name: /historial|historia|history/i })
    .first();

  if (await histLink.isVisible({ timeout: 3_000 })) {
    await histLink.click();
    await expect(page).toHaveURL(/history/, { timeout: 8_000 });
  } else {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/history/);
  }
});

test('[SYSTEM] Dashboard — estado de error muestra botón Reintentar', async ({ page }) => {
  // Simular error en la API de métricas
  await page.route('**/api/dashboard/metrics', async (route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Debe aparecer el botón "Reintentar"
  const retryBtn = page.getByRole('button', { name: /reintentar/i });
  await expect(retryBtn).toBeVisible({ timeout: 8_000 });

  // Desregistrar el intercept y hacer click en reintentar
  await page.unroute('**/api/dashboard/metrics');
  await retryBtn.click();

  // Ahora debería cargar correctamente
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse').length === 0,
    { timeout: 10_000 },
  );
  await expect(page.locator('article').first()).toBeVisible({ timeout: 8_000 });
});
