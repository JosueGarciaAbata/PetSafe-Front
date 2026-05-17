import { test, expect } from '@playwright/test';

test('[SYSTEM] Abrir dashboard operativo', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Citas de hoy')).toBeVisible();
  await expect(page.getByText('En cola')).toBeVisible();
  await expect(page.getByText('En consulta')).toBeVisible();
  await expect(page.getByText('Finalizados')).toBeVisible();
});
