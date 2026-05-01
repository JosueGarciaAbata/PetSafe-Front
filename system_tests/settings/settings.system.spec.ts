import { test, expect } from '@playwright/test';
import { getTokenFromPage } from '../helpers/appointments-api';
import { TestUserProfile, updateTestUserProfile } from '../helpers/settings-api';

async function readStoredProfile(page: Parameters<typeof getTokenFromPage>[0]): Promise<TestUserProfile> {
  return page.evaluate(() => {
    const rawUser = localStorage.getItem('petsafe.auth.user');
    if (!rawUser) {
      throw new Error('No hay usuario autenticado en localStorage.');
    }

    const user = JSON.parse(rawUser) as {
      nombres: string;
      apellidos: string;
      telefono?: string;
    };

    return {
      firstName: user.nombres,
      lastName: user.apellidos,
      phone: user.telefono ?? '',
    };
  });
}

test('[SYSTEM] Abrir configuracion y ver bloque de correo', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Configuracion' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Datos personales' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Correo electronico' })).toBeVisible();
  await expect(page.getByText('admin@safepet.com')).toBeVisible();

  await page.getByRole('button', { name: 'Actualizar correo' }).click();
  await expect(page.getByRole('heading', { name: 'Actualizar correo' })).toBeVisible();
  await expect(page.getByPlaceholder('nuevo@correo.com')).toBeVisible();
  await expect(page.getByPlaceholder('6 digitos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar cambio' })).toBeDisabled();
});

test('[SYSTEM] Actualizar datos personales de configuracion', async ({ page, request }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');

  const token = await getTokenFromPage(page);
  const originalProfile = await readStoredProfile(page);

  try {
    await page.getByLabel('Nombre').fill('Admin Test');
    await page.getByLabel('Apellido').fill('SafePet Test');
    await page.getByLabel('Telefono').fill('0991234567');

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/users/me') && r.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Guardar cambios' }).click(),
    ]);

    expect(res.status()).toBe(200);
    await expect(page.getByLabel('Nombre')).toHaveValue('Admin Test');
    await expect(page.getByLabel('Apellido')).toHaveValue('SafePet Test');
    await expect(page.getByLabel('Telefono')).toHaveValue('0991234567');
  } finally {
    await updateTestUserProfile(request, token, originalProfile);
  }
});
