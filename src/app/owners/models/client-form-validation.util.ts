import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const CLIENT_NAME_MAX_LENGTH = 80;
export const CLIENT_DOCUMENT_ID_MAX_LENGTH = 10;
export const CLIENT_ADDRESS_MAX_LENGTH = 255;
export const CLIENT_NOTES_MAX_LENGTH = 255;
export const CLIENT_MIN_BIRTH_DATE = '1970-01-01';
export const CLIENT_PHONE_PATTERN = /^\d+$/;

export function clientMinDateValidator(minDate: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    if (!value) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { invalidDate: true };
    }

    return value < minDate
      ? {
          minDate: {
            min: minDate,
            actual: value,
          },
        }
      : null;
  };
}
