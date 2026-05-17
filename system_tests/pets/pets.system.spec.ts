import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestPet } from '../helpers/entities-api';

test('[SYSTEM] Abrir mascotas, buscar y ver ficha base', async ({ page, request }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pet = await createTestPet(request, token);

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Mascotas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nueva mascota' })).toBeVisible();

  await page.getByPlaceholder('Buscar por nombre, tutor o especie').fill(pet.name);
  const row = page.locator('tbody tr').filter({ hasText: pet.name }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver detalle de la mascota' }).click();

  await expect(page).toHaveURL(new RegExp(`/pets/${pet.id}$`));
  await expect(page.getByRole('heading', { name: pet.name })).toBeVisible();
  await expect(page.getByText('Ficha clínica base del paciente')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar mascota' })).toBeVisible();
  await expect(page.getByText('Especie / Raza')).toBeVisible();
});

test('[SYSTEM] Abrir formulario de nueva mascota sin entrar a vacunacion', async ({ page }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Nueva mascota' }).click();
  await expect(page).toHaveURL(/\/pets\/new$/);
  await expect(page.getByText(/Volver a mascotas|Volver al propietario/)).toBeVisible();
  await expect(page.getByText('Datos básicos')).toBeVisible();
});
