import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestOwner } from '../helpers/entities-api';

test('[SYSTEM] Abrir propietarios y buscar registro', async ({ page, request }) => {
  await page.goto('/owners');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const owner = await createTestOwner(request, token);

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Propietarios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo propietario' })).toBeVisible();

  await page.getByPlaceholder('Buscar por nombre, correo o mascota').fill(owner.fullName);
  const row = page.locator('tbody tr').filter({ hasText: owner.fullName }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver detalle del propietario' }).click();

  await expect(page).toHaveURL(new RegExp(`/owners/${owner.id}$`));
  await expect(page.getByRole('heading', { name: owner.fullName })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar propietario' })).toBeVisible();
});

test('[SYSTEM] Abrir formulario de nuevo propietario', async ({ page }) => {
  await page.goto('/owners');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Nuevo propietario' }).click();
  await expect(page).toHaveURL(/\/owners\/new$/);
  await expect(page.getByRole('heading', { name: 'Nuevo propietario' })).toBeVisible();
  await expect(page.getByPlaceholder('Ej. Adriana')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar propietario' })).toBeVisible();
});
