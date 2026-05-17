import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestPet } from '../helpers/entities-api';

test('[SYSTEM] Abrir reporteria y buscar paciente para historial PDF', async ({ page, request }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pet = await createTestPet(request, token, 'Reporte Mascota');

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Reporteria' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historial clinico del paciente' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda de citas' })).toBeVisible();

  await page.getByPlaceholder('Buscar por nombre del paciente, tutor o especie').fill(pet.name);
  await expect(page.getByText(pet.name).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver PDF' }).first()).toBeVisible();
});
