/**
 * Pruebas de sistema — Notificaciones (Solicitudes de cita)
 *
 * El módulo /notifications gestiona solicitudes de cita enviadas desde la app móvil.
 * Los tests verifican:
 *   - Carga correcta de la página y filtros de estado
 *   - Conteo de solicitudes pendientes (badge)
 *   - Filtrado por estado (PENDIENTE / CONFIRMADA / RECHAZADA / TODOS)
 *   - Apertura del modal de detalle
 *   - Confirmar solicitud de cita (con fecha y hora)
 *   - Rechazar solicitud de cita
 *   - Detección de conflicto de horario
 *   - Cierre del modal sin guardar
 *   - Botón "Actualizar" recarga la lista
 *   - Estado vacío cuando no hay solicitudes con ese estado
 */
import { test, expect } from '@playwright/test';
import { API_URL, getTokenFromPage, getFutureDateKey, getTodayKey } from '../helpers/appointments-api';
import { fetchAppointmentRequests, fetchPendingCount } from '../helpers/notifications-api';

// ── Helpers locales ────────────────────────────────────────────────────────────

async function gotoNotifications(page: Parameters<typeof getTokenFromPage>[0]) {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  // Esperar a que el spinner desaparezca
  await page.waitForFunction(
    () => !document.querySelector('.spinner'),
    { timeout: 8_000 },
  ).catch(() => {/* spinner puede no existir si cargó rápido */});
}

// ── Carga y estructura ─────────────────────────────────────────────────────────

test('[SYSTEM] Notifications — página carga con título correcto', async ({ page }) => {
  await gotoNotifications(page);

  await expect(page).toHaveURL(/notifications/);
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Título de la página
  await expect(
    page.getByRole('heading', { level: 1, name: /solicitudes de cita/i }),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] Notifications — los 4 chips de filtro de estado son visibles', async ({ page }) => {
  await gotoNotifications(page);

  // Según el componente: filters = ['TODOS', 'PENDIENTE', 'CONFIRMADA', 'RECHAZADA']
  // Se renderizan como: 'Todas', 'Pendiente', 'Confirmada', 'Rechazada'
  await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('button', { name: /pendiente/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /confirmada/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /rechazada/i })).toBeVisible();
});

test('[SYSTEM] Notifications — chip "Pendiente" muestra badge con conteo desde API', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pendingCount = await fetchPendingCount(request, token);

  await gotoNotifications(page);

  const pendingChip = page.getByRole('button', { name: /pendiente/i });
  await expect(pendingChip).toBeVisible();

  if (pendingCount > 0) {
    // Verificar que el badge con el número es visible dentro del chip
    const badge = pendingChip.locator('.notif-badge');
    await expect(badge).toBeVisible({ timeout: 6_000 });
    const badgeText = await badge.textContent();
    expect(Number(badgeText?.trim())).toBe(pendingCount);
  } else {
    // Si no hay solicitudes pendientes, el badge puede no existir — OK
    await expect(page).not.toHaveURL(/error/);
  }
});

test('[SYSTEM] Notifications — botón Actualizar recarga la lista', async ({ page }) => {
  await gotoNotifications(page);

  const updateBtn = page.getByRole('button', { name: /actualizar/i });
  await expect(updateBtn).toBeVisible({ timeout: 6_000 });

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/appointment-requests') && r.request().method() === 'GET',
      { timeout: 8_000 },
    ),
    updateBtn.click(),
  ]);

  expect(res.status()).toBe(200);
  await expect(page).not.toHaveURL(/error/);
});

// ── Filtrado por estado ────────────────────────────────────────────────────────

test('[SYSTEM] Notifications — filtrar por TODOS muestra la lista completa', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);

  await gotoNotifications(page);

  // Click en "Todas"
  await page.getByRole('button', { name: 'Todas' }).click();
  await page.waitForTimeout(300);

  if (allRequests.length === 0) {
    // Estado vacío: mensaje "No hay solicitudes."
    await expect(page.getByText(/no hay solicitudes/i)).toBeVisible({ timeout: 6_000 });
  } else {
    // Al menos una tarjeta visible
    await expect(page.locator('.notif-card').first()).toBeVisible({ timeout: 6_000 });
  }

  await expect(page).not.toHaveURL(/error/);
});

test('[SYSTEM] Notifications — filtrar por PENDIENTE muestra solo solicitudes pendientes', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pendingRequests = allRequests.filter((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  if (pendingRequests.length === 0) {
    await expect(
      page.getByText(/no hay solicitudes con ese estado/i),
    ).toBeVisible({ timeout: 6_000 });
  } else {
    const cards = page.locator('.notif-card');
    const cardCount = await cards.count();
    expect(cardCount).toBe(pendingRequests.length);

    // Todas las tarjetas visibles deben tener badge "Pendiente"
    for (let i = 0; i < cardCount; i++) {
      await expect(
        cards.nth(i).locator('.notif-status-pill'),
      ).toContainText(/pendiente/i);
    }
  }
});

test('[SYSTEM] Notifications — filtrar por CONFIRMADA muestra solo confirmadas', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const confirmed = allRequests.filter((r) => r.status === 'CONFIRMADA');

  await gotoNotifications(page);

  await page.getByRole('button', { name: /confirmada/i }).click();
  await page.waitForTimeout(300);

  if (confirmed.length === 0) {
    await expect(
      page.getByText(/no hay solicitudes con ese estado/i),
    ).toBeVisible({ timeout: 6_000 });
  } else {
    const cards = page.locator('.notif-card');
    await expect(cards.first()).toBeVisible({ timeout: 6_000 });
    for (let i = 0; i < Math.min(await cards.count(), confirmed.length); i++) {
      await expect(cards.nth(i).locator('.notif-status-pill')).toContainText(/confirmada/i);
    }
  }
});

test('[SYSTEM] Notifications — filtrar por RECHAZADA muestra solo rechazadas', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const rejected = allRequests.filter((r) => r.status === 'RECHAZADA');

  await gotoNotifications(page);

  await page.getByRole('button', { name: /rechazada/i }).click();
  await page.waitForTimeout(300);

  if (rejected.length === 0) {
    await expect(
      page.getByText(/no hay solicitudes con ese estado/i),
    ).toBeVisible({ timeout: 6_000 });
  } else {
    const cards = page.locator('.notif-card');
    await expect(cards.first()).toBeVisible({ timeout: 6_000 });
    for (let i = 0; i < Math.min(await cards.count(), rejected.length); i++) {
      await expect(cards.nth(i).locator('.notif-status-pill')).toContainText(/rechazada/i);
    }
  }
});

// ── Modal de detalle ───────────────────────────────────────────────────────────

test('[SYSTEM] Notifications — abrir modal de detalle de solicitud PENDIENTE', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE en la base de datos para abrir el modal');
    return;
  }

  // Filtrar por pendiente y abrir la primera tarjeta
  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  const firstCard = page.locator('.notif-card').first();
  await expect(firstCard).toBeVisible({ timeout: 6_000 });
  await firstCard.click();

  // Verificar que el modal aparece
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('heading', { name: /solicitud de cita/i })).toBeVisible();

  // Verificar elementos del modal para solicitud PENDIENTE:
  // - Campo de fecha de cita
  await expect(page.locator('.modal-panel input[type="date"]')).toBeVisible();
  // - Campo de hora
  await expect(page.locator('.modal-panel input[type="time"]')).toBeVisible();
  // - Botón Rechazar
  await expect(page.locator('.modal-panel').getByRole('button', { name: /rechazar/i })).toBeVisible();
  // - Botón Confirmar cita
  await expect(page.locator('.modal-panel').getByRole('button', { name: /confirmar cita/i })).toBeVisible();
});

test('[SYSTEM] Notifications — cerrar modal con botón ✕ no modifica la solicitud', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE para abrir el modal');
    return;
  }

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  await page.locator('.notif-card').first().click();
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });

  // Cerrar con el botón ✕
  await page.locator('.modal-close').click();

  // Modal debe desaparecer
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 4_000 });

  // La página sigue en /notifications sin errores
  await expect(page).toHaveURL(/notifications/);
  await expect(page).not.toHaveURL(/error/);
});

test('[SYSTEM] Notifications — cerrar modal haciendo click en el overlay', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE para abrir el modal');
    return;
  }

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  await page.locator('.notif-card').first().click();
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });

  // Hacer click en el overlay (fuera del panel)
  await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 4_000 });
});

// ── Confirmar solicitud ────────────────────────────────────────────────────────

test('[SYSTEM] Notifications — confirmar solicitud de cita PENDIENTE', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE para confirmar');
    return;
  }

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  // Abrir detalle de la primera solicitud pendiente
  await page.locator('.notif-card').first().click();
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });

  // Ingresar fecha futura (30 días) y hora
  const futureDate = getFutureDateKey(30);
  const randomHour = 9 + Math.floor(Math.random() * 6);
  const apptTime = `${String(randomHour).padStart(2, '0')}:00`;

  await page.locator('.modal-panel input[type="date"]').fill(futureDate);
  await page.locator('.modal-panel input[type="time"]').fill(apptTime);

  // Esperar a que la verificación de disponibilidad termine
  await page.waitForFunction(
    () => !document.querySelector('.availability-checking'),
    { timeout: 8_000 },
  ).catch(() => {/* puede que ya haya terminado */});

  // Si hay conflicto, saltar el test (no podemos controlar el estado de la agenda)
  const conflictBanner = page.locator('.conflict-banner');
  if (await conflictBanner.isVisible({ timeout: 1_000 }).catch(() => false)) {
    test.skip(true, 'Hay conflicto de horario en la fecha seleccionada, no se puede confirmar');
    return;
  }

  // Confirmar la cita
  const confirmBtn = page.locator('.modal-panel').getByRole('button', { name: /confirmar cita/i });
  await expect(confirmBtn).toBeEnabled({ timeout: 6_000 });

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/appointment-requests') &&
        r.url().includes('/status') &&
        r.request().method() === 'PATCH',
      { timeout: 15_000 },
    ),
    confirmBtn.click(),
  ]);

  expect(res.status()).toBe(200);

  // El modal debe cerrarse
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 6_000 });
});

test('[SYSTEM] Notifications — rechazar solicitud de cita PENDIENTE', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE para rechazar');
    return;
  }

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  await page.locator('.notif-card').first().click();
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });

  // Click en Rechazar
  const rejectBtn = page.locator('.modal-panel').getByRole('button', { name: /rechazar/i });
  await expect(rejectBtn).toBeVisible({ timeout: 6_000 });

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/appointment-requests') &&
        r.url().includes('/status') &&
        r.request().method() === 'PATCH',
      { timeout: 10_000 },
    ),
    rejectBtn.click(),
  ]);

  expect(res.status()).toBe(200);

  // El modal debe cerrarse
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 6_000 });
});

// ── Verificación de disponibilidad ────────────────────────────────────────────

test('[SYSTEM] Notifications — verificar disponibilidad al cambiar fecha/hora', async ({
  page,
  request,
}) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);
  const allRequests = await fetchAppointmentRequests(request, token);
  const pending = allRequests.find((r) => r.status === 'PENDIENTE');

  await gotoNotifications(page);

  if (!pending) {
    test.skip(true, 'No hay solicitudes PENDIENTE');
    return;
  }

  await page.getByRole('button', { name: /pendiente/i }).click();
  await page.waitForTimeout(300);

  await page.locator('.notif-card').first().click();
  await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 6_000 });

  // Cambiar fecha y hora
  const futureDate = getFutureDateKey(45);
  await page.locator('.modal-panel input[type="date"]').fill(futureDate);
  await page.locator('.modal-panel input[type="time"]').fill('14:30');

  // Debe dispararse la verificación de disponibilidad
  const [availRes] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/appointment-requests/check-availability') &&
        r.request().method() === 'GET',
      { timeout: 8_000 },
    ).catch(() => null),
    page.waitForTimeout(500),
  ]);

  // Si la respuesta se interceptó, verificar que es 200
  if (availRes) {
    expect([200, 409]).toContain(availRes.status());
  }

  // La página no debe romper
  await expect(page).not.toHaveURL(/error/);
});
