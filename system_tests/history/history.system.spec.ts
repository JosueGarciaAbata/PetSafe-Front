import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestPet } from '../helpers/entities-api';

test('[SYSTEM] Abrir historial clinico y buscar paciente', async ({ page, request }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pet = await createTestPet(request, token, 'Historial Mascota');

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Historial clínico' })).toBeVisible();
  await page.getByPlaceholder('Buscar por nombre de paciente o tutor').fill(pet.name);

  const row = page.locator('tbody tr').filter({ hasText: pet.name }).first();
  await expect(row).toBeVisible();
  await expect(row.getByRole('button', { name: 'Descargar historial clínico PDF' })).toBeVisible();
});

test('[SYSTEM] Abrir detalle de historial clinico por paciente', async ({ page, request }) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const pet = await createTestPet(request, token, 'Detalle Historial');

  await page.goto(`/history/${pet.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'Volver a historial' })).toBeVisible();
  await expect(page.getByRole('heading', { name: pet.name })).toBeVisible();
  await expect(page.getByText('Atenciones clinicas')).toBeVisible();
});
