import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import {
  buildTestPetName,
  createAdoptionTestPet,
  createTestAdoption,
} from '../helpers/adoptions-api';

test('[SYSTEM] Registrar nueva adopcion', async ({ page, request }) => {
  await page.goto('/adoption');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pet = await createAdoptionTestPet(request, token, buildTestPetName('Nueva Adopcion'));

  await page.getByRole('button', { name: 'Nueva adopcion' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva adopcion' })).toBeVisible();

  await page.getByPlaceholder('Buscar por nombre, tutor o especie').fill(pet.name);
  await expect(page.locator('tbody tr').filter({ hasText: pet.name })).toBeVisible();
  await page.locator('tbody tr').filter({ hasText: pet.name }).getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Detalles de adopcion' })).toBeVisible();
  await page.getByPlaceholder('0999999999').fill('0997776655');
  await page.getByPlaceholder('Fundacion PetSafe').fill('Fundacion PetSafe');
  await page.getByPlaceholder('adopciones@petsafe.com').fill('adopciones@petsafe.com');
  await page
    .getByPlaceholder('Contexto de rescate, comportamiento o situacion actual.')
    .fill('Paciente sociable y apto para familia responsable.');
  await page
    .getByPlaceholder('Ej. casa con patio, seguimiento veterinario o experiencia con cachorros.')
    .fill('Seguimiento veterinario y compromiso de cuidado.');
  await page
    .getByPlaceholder('Observaciones operativas para el seguimiento del proceso.')
    .fill('[TEST SYSTEM] Adopcion creada desde prueba de sistema.');

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/adoptions') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Guardar adopcion' }).click(),
  ]);

  expect(res.status()).toBe(201);
  await expect(page).toHaveURL(/\/adoption$/);
  await expect(page.getByText(`Adopcion registrada para ${pet.name}.`)).toBeVisible();
});

test('[SYSTEM] Abrir detalle de adopcion desde listado', async ({ page, request }) => {
  await page.goto('/adoption');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const adoption = await createTestAdoption(request, token);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Buscar por nombre, especie o raza').fill(adoption.patientName);

  const row = page.locator('tbody tr').filter({ hasText: adoption.patientName }).first();
  await expect(row).toBeVisible();
  await row.click();

  await expect(page).toHaveURL(new RegExp(`/adoption/${adoption.id}/edit$`));
  await expect(page.getByRole('heading', { name: 'Editar adopcion' })).toBeVisible();
  await expect(page.getByPlaceholder('0999999999')).toHaveValue('0998887766');
});
