import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('[SYSTEM] Login muestra validaciones basicas', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Inicia sesion para continuar' })).toBeVisible();
  await expect(page.getByPlaceholder('ejemplo@correo.com')).toBeVisible();
  await expect(page.getByPlaceholder('Ingresa tu contrasena')).toBeVisible();

  await page.getByRole('button', { name: 'Iniciar sesion' }).click();
  await expect(page.getByText('El correo es obligatorio')).toBeVisible();
});

test('[SYSTEM] Pagina de acceso restringido', async ({ page }) => {
  await page.goto('/unauthorized');

  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al login' })).toBeVisible();
});

test('[SYSTEM] Pagina de error generica', async ({ page }) => {
  await page.goto('/error');

  await expect(page.getByRole('heading', { name: 'Algo salio mal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
});
