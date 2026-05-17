import { test, expect } from '@playwright/test';

test('[SYSTEM] Abrir catalogo de procedimientos', async ({ page }) => {
  await page.goto('/catalogs/procedures');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Procedimientos' })).toBeVisible();
  await expect(page.getByPlaceholder('Buscar por nombre o descripción')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inactivos' })).toBeVisible();
});

test('[SYSTEM] Abrir catalogo de cirugias', async ({ page }) => {
  await page.goto('/catalogs/surgeries');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Cirugías' })).toBeVisible();
  await expect(page.getByPlaceholder('Buscar por nombre, descripción o anestesia')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inactivos' })).toBeVisible();
});
