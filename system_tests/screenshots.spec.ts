import { test } from '@playwright/test';

test.describe('Generación de Capturas de Pantalla', () => {
  // Configuración de tamaño de pantalla para capturas consistentes
  test.use({ viewport: { width: 1280, height: 720 } });

  test('Prueba 1: Búsqueda de pacientes e Historial Clínico', async ({ page }) => {
    // Navigate to pets/patients/history page (depending on where the search is)
    await page.goto('/pets'); // or /history, checking /pets first
    await page.waitForLoadState('networkidle');
    
    // Si hay un campo de búsqueda, escribimos algo opcionalmente
    // await page.getByPlaceholder('Buscar').fill('Rex');
    
    await page.screenshot({ path: '../../docs-latex/system_tests/images/screenshot_busqueda_pacientes.png' });
  });

  test('Prueba 2: Generación de agenda por fechas', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '../../docs-latex/system_tests/images/screenshot_agenda_fechas.png' });
  });

  test('Prueba 1: Tarjetas de KPI y consistencia de datos & Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Esperar a que los skeletons desaparezcan
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 10_000 },
    ).catch(() => {});
    
    await page.screenshot({ path: '../../docs-latex/system_tests/images/screenshot_dashboard_kpi.png' });
  });

  test('X.1.8. Notificaciones (Solicitudes de Cita)', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '../../docs-latex/system_tests/images/screenshot_notificaciones.png' });
  });
});
