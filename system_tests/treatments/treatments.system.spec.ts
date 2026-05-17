import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { createTestTreatment } from '../helpers/entities-api';

test('[SYSTEM] Abrir tratamientos, filtrar y ver detalle', async ({ page, request }) => {
  await page.goto('/treatments');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const treatment = await createTestTreatment(request, token);

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Tratamientos' })).toBeVisible();
  await expect(page.getByPlaceholder('Buscar por mascota')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizados' })).toBeVisible();

  await page.getByPlaceholder('Buscar por mascota').fill(treatment.patientName);
  const row = page.locator('tbody tr').filter({ hasText: treatment.patientName }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ver detalle del tratamiento' }).click();

  await expect(page).toHaveURL(new RegExp(`/treatments/${treatment.id}$`));
  await expect(page.getByRole('heading', { name: `Tratamiento #${treatment.id}` })).toBeVisible();
  await expect(page.getByText(treatment.instructions)).toBeVisible();
  await expect(page.getByText('Items del tratamiento')).toBeVisible();
});
