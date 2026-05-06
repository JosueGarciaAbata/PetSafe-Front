/**
 * Setup de autenticación — se ejecuta UNA sola vez antes de todos los proyectos.
 * Hace login real vía la UI y guarda la sesión (localStorage + cookies) en disco.
 * Los tests la reutilizan sin necesidad de re-loguear.
 *
 * Variables de entorno requeridas:
 *   TEST_USER_EMAIL
 *   TEST_USER_PASSWORD
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('autenticar usuario de pruebas', async ({ page }) => {
  const email = process.env['TEST_USER_EMAIL'];
  const password = process.env['TEST_USER_PASSWORD'];

  if (!email || !password) {
    throw new Error(
      'Faltan credenciales. Define TEST_USER_EMAIL y TEST_USER_PASSWORD antes de correr las pruebas.',
    );
  }

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
});
