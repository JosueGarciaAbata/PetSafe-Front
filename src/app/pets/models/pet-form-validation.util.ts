export const PET_NAME_MAX_LENGTH = 120;
export const PET_COLOR_MAX_LENGTH = 50;
export const PET_MICROCHIP_MAX_LENGTH = 80;
export const PET_TEXTAREA_MAX_LENGTH = 255;
export const PET_WEIGHT_MAX = 999999.99;
export const PET_WEIGHT_STEP = '0.01';
export const PET_BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const PET_NAME_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ' .-]*$/;
export const PET_MIN_BIRTH_DATE = buildIsoDateYearsAgo(40);
export const PET_MAX_BIRTH_DATE = buildIsoDate(new Date());

export function buildIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildIsoDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return buildIsoDate(date);
}

export function normalizePetText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidPetBirthDate(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  if (!PET_BIRTH_DATE_PATTERN.test(normalized)) {
    return false;
  }

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (date.toISOString().slice(0, 10) !== normalized) {
    return false;
  }

  return normalized >= PET_MIN_BIRTH_DATE && normalized <= PET_MAX_BIRTH_DATE;
}

export function parsePositivePetWeight(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parsedWeight = Number(normalized);
  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > PET_WEIGHT_MAX) {
    return null;
  }

  return parsedWeight;
}

export function isValidPetName(value: string): boolean {
  const normalized = normalizePetText(value);
  return normalized.length > 0 && normalized.length <= PET_NAME_MAX_LENGTH && PET_NAME_PATTERN.test(normalized);
}
