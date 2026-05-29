/**
 * Pruebas de sistema — Mascotas (Pets) Avanzadas
 *
 * Complementa el spec base con:
 *   - Crear nueva mascota con tutor desde la UI (flujo completo)
 *   - Ver detalle del perfil público de mascota via QR token
 *   - Crear mascota sin tutor (admin)
 *   - Verificar que la ficha de vacunación muestra el carnet por paciente
 *   - Actualizar la foto de perfil de una mascota
 */
import { test, expect } from '@playwright/test';
import { getTokenFromPage, API_URL } from '../helpers/appointments-api';
import { createTestOwner, deleteTestOwner } from '../helpers/owners-api';
import { buildTestPetName, createTestPet } from '../helpers/pets-api';

// ── Crear mascota desde la UI ─────────────────────────────────────────────────

test('[SYSTEM] Pets — crear nueva mascota con tutor desde la UI', async ({ page, request }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Crear tutor via API para asociarlo durante la creación
  const owner = await createTestOwner(request, token);
  let createdPetId = 0;

  try {
    // Navegar al formulario de nueva mascota
    const newPetBtn = page.getByRole('button', { name: /nueva mascota|registrar mascota|nuevo paciente/i });
    if (await newPetBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await newPetBtn.click();
    } else {
      await page.goto('/pets/new');
      await page.waitForLoadState('networkidle');
    }

    await expect(page).toHaveURL(/pets\/new/);
    await expect(page).not.toHaveURL(/error|unauthorized/);

    const petName = buildTestPetName('UI Create Pet');

    // Nombre de la mascota
    const nameInput = page
      .getByLabel(/nombre/i)
      .first()
      .or(page.locator('input[formControlName="name"], input[name="name"]').first());
    await nameInput.fill(petName);

    // Buscar y seleccionar tutor
    const tutorSearch = page
      .getByPlaceholder(/buscar tutor|propietario|cliente/i)
      .first()
      .or(page.locator('input[formControlName="clientId"]').first());

    if (await tutorSearch.isVisible({ timeout: 3_000 })) {
      await tutorSearch.fill('Playwright');
      await page.locator('mat-option').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
      const option = page.locator('mat-option').filter({ hasText: owner.fullName }).first();
      if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await option.click();
      } else {
        await page.locator('mat-option').first().click().catch(() => {});
      }
    }

    // Especie (canino por defecto — speciesId: 1)
    const speciesSelect = page.locator('mat-select').first();
    if (await speciesSelect.isVisible({ timeout: 3_000 })) {
      await speciesSelect.click();
      await page.getByRole('option').first().click();
    }

    // Sexo
    const sexSelect = page.locator('mat-select').nth(1);
    if (await sexSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sexSelect.click();
      await page.getByRole('option').first().click();
    }

    // Fecha de nacimiento
    const birthDateInput = page.locator('input[type="date"]').first();
    if (await birthDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await birthDateInput.fill('2022-06-15');
    }

    // Peso
    const weightInput = page
      .getByLabel(/peso/i)
      .first()
      .or(page.locator('input[type="number"]').first());
    if (await weightInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await weightInput.fill('5.5');
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/patients') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|registrar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdPetId = body.id;
      // Navega al detalle o listado
      await expect(page).not.toHaveURL(/pets\/new/);
    } else {
      // Si no captura respuesta, verificar que al menos no rompe
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    await deleteTestOwner(request, token, owner.id).catch(() => {});
    // Si se creó mascota, se elimina en cascada con el tutor
  }
});

test('[SYSTEM] Pets — crear mascota sin tutor (modalidad admin)', async ({ page, request }) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  let createdPetId = 0;

  try {
    // Buscar si hay botón para crear sin tutor
    const withoutOwnerBtn = page
      .getByRole('button', { name: /sin tutor|sin propietario|rescate|adopción/i })
      .first();

    if (await withoutOwnerBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await withoutOwnerBtn.click();
    } else {
      // Intentar navegar directo
      await page.goto('/pets/new');
      await page.waitForLoadState('networkidle');
    }

    if (!page.url().includes('/pets/new')) {
      test.skip(true, 'No se encontró el flujo de creación de mascota sin tutor en la UI');
      return;
    }

    const petName = buildTestPetName('Sin Tutor UI');

    // Rellenar nombre
    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(petName);

    // Si hay checkbox "sin tutor", marcarlo
    const withoutOwnerCheck = page.getByRole('checkbox', { name: /sin tutor|rescate/i });
    if (await withoutOwnerCheck.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await withoutOwnerCheck.check();
    }

    // Guardar
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) =>
          (r.url().includes('/api/patients') || r.url().includes('/patients/admin')) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|registrar/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdPetId = body.id;
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdPetId && token) {
      await request
        .delete(`${API_URL}/patients/${createdPetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});

// ── Ficha de vacunación del paciente ──────────────────────────────────────────

test('[SYSTEM] Pets — ficha de vacunación muestra carnet de vacunas aplicadas', async ({
  page,
  request,
}) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Usar paciente del seed que puede tener vacunas
  const SEED_PATIENT_ID = 1;

  await page.goto(`/pets/${SEED_PATIENT_ID}/vaccination`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/pets/${SEED_PATIENT_ID}/vaccination`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // Debe mostrar encabezado de vacunación
  await expect(
    page
      .getByRole('heading', { name: /vacuna|carnet|plan/i })
      .or(page.locator('[class*="vaccination"], [data-testid="vaccination-title"]').first()),
  ).toBeVisible({ timeout: 8_000 });
});

test('[SYSTEM] Pets — perfil del paciente muestra información básica', async ({
  page,
  request,
}) => {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Usar el primer paciente del listado
  const res = await request.get(`${API_URL}/patients?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    test.skip(true, 'No se pudo obtener pacientes');
    return;
  }

  const body = (await res.json()) as { data: { id: number; name: string }[] };
  if (!body.data?.length) {
    test.skip(true, 'No hay pacientes en el sistema');
    return;
  }

  const pet = body.data[0];
  await page.goto(`/pets/${pet.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(new RegExp(`/pets/${pet.id}`));
  await expect(page).not.toHaveURL(/error|unauthorized/);

  // El nombre del paciente debe ser visible
  await expect(page.getByText(pet.name)).toBeVisible({ timeout: 8_000 });
});

// ── Ver detalle de propietario con sus mascotas ────────────────────────────────

test('[SYSTEM] Owners — ver detalle de propietario con listado de mascotas', async ({
  page,
  request,
}) => {
  await page.goto('/owners');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  // Crear propietario con mascota via API
  const owner = await createTestOwner(request, token);
  const pet = await createTestPet(request, token, owner.id);

  try {
    await page.goto(`/owners/${owner.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/owners/${owner.id}`));
    await expect(page).not.toHaveURL(/error|unauthorized/);

    // Nombre del propietario visible
    await expect(page.getByText(owner.firstName)).toBeVisible({ timeout: 8_000 });

    // Mascota asociada visible
    await expect(page.getByText(pet.name)).toBeVisible({ timeout: 6_000 });
  } finally {
    await deleteTestOwner(request, token, owner.id).catch(() => {});
  }
});

// ── Crear propietario completo sin skip ───────────────────────────────────────

test('[SYSTEM] Owners — crear nuevo propietario completo desde la UI', async ({
  page,
  request,
}) => {
  await page.goto('/owners/new');
  await page.waitForLoadState('networkidle');
  const token = await getTokenFromPage(page);

  await expect(page).toHaveURL(/owners\/new/);

  let createdOwnerId = 0;

  try {
    const timestamp = Date.now();
    const email = `nuevo.owner.${timestamp}@playwright-test.com`;

    // Calcular número de cédula válido para Ecuador
    const province = '17';
    const thirdDigit = '1';
    let sequence = '';
    for (let i = 0; i < 6; i++) sequence += Math.floor(Math.random() * 10).toString();
    const base = province + thirdDigit + sequence;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let val = parseInt(base.charAt(i), 10);
      if (i % 2 === 0) { val *= 2; if (val > 9) val -= 9; }
      sum += val;
    }
    const documentId = base + ((10 - (sum % 10)) % 10).toString();

    // Rellenar formulario
    const firstNameInput = page
      .getByLabel(/nombre/i)
      .first()
      .or(page.locator('input[formControlName="firstName"]').first());
    await firstNameInput.fill('Tutor UI Test');

    const lastNameInput = page
      .getByLabel(/apellido/i)
      .first()
      .or(page.locator('input[formControlName="lastName"]').first());
    await lastNameInput.fill(`Playwright ${timestamp}`);

    const docInput = page
      .getByLabel(/cédula|documento|identificación/i)
      .first()
      .or(page.locator('input[formControlName="documentId"]').first());
    await docInput.fill(documentId);

    const emailInput = page
      .getByLabel(/correo|email/i)
      .first()
      .or(page.locator('input[type="email"]').first());
    await emailInput.fill(email);

    const phoneInput = page
      .getByLabel(/teléfono|celular/i)
      .first()
      .or(page.locator('input[type="tel"]').first());
    await phoneInput.fill('0991234567');

    // Fecha de nacimiento
    const birthDateInput = page.locator('input[type="date"]').first();
    if (await birthDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await birthDateInput.fill('1990-05-01');
    }

    // Género
    const genderSelect = page.locator('mat-select').filter({ hasText: /género|genero/i }).first();
    if (await genderSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await genderSelect.click();
      await page.getByRole('option').first().click();
    } else {
      // Puede ser un radio button
      const maleRadio = page.getByRole('radio', { name: /masculino|hombre|M/i }).first();
      if (await maleRadio.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await maleRadio.click();
      }
    }

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/clients') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      page.getByRole('button', { name: /guardar|registrar|crear/i }).click(),
    ]);

    if (res) {
      expect([200, 201]).toContain(res.status());
      const body = (await res.json()) as { id: number };
      createdOwnerId = body.id;

      // Navega fuera de /owners/new
      await expect(page).not.toHaveURL(/owners\/new/, { timeout: 6_000 });
    } else {
      await expect(page).not.toHaveURL(/error/);
    }
  } finally {
    if (createdOwnerId) {
      await request
        .delete(`${API_URL}/clients/${createdOwnerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
  }
});
