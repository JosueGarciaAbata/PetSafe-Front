export const PET_NAME_MAX_LENGTH = 120;
export const PET_MICROCHIP_MAX_LENGTH = 80;
export const PET_TEXTAREA_MAX_LENGTH = 255;
export const PET_WEIGHT_MAX = 999999.99;
export const PET_WEIGHT_STEP = '0.01';
export const PET_BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  return date.toISOString().slice(0, 10) === normalized;
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
