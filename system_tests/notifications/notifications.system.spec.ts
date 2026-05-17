import { test, expect } from '@playwright/test';

test('[SYSTEM] Abrir solicitudes de cita y cambiar filtros', async ({ page }) => {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Solicitudes de cita' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Todas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pendiente/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirmada/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Rechazada/ })).toBeVisible();

  await page.getByRole('button', { name: /Pendiente/ }).click();
  await expect(page.locator('.notif-filter-chip--active')).toContainText('Pendiente');
});
