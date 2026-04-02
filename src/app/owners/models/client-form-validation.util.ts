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
export const ECUADOR_CEDULA_PATTERN = /^\d{10}$/;

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

export function ecuadorCedulaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    if (!value) {
      return null;
    }

    if (!ECUADOR_CEDULA_PATTERN.test(value)) {
      return { invalidCedulaFormat: true };
    }

    const provinceCode = Number(value.slice(0, 2));
    const thirdDigit = Number(value.charAt(2));

    if (provinceCode < 1 || provinceCode > 24 || thirdDigit >= 6) {
      return { invalidCedula: true };
    }

    const verifierDigit = Number(value.charAt(9));
    const digits = value
      .slice(0, 9)
      .split('')
      .map((digit) => Number(digit));

    const total = digits.reduce((sum, digit, index) => {
      if (index % 2 === 0) {
        const doubled = digit * 2;
        return sum + (doubled > 9 ? doubled - 9 : doubled);
      }

      return sum + digit;
    }, 0);

    const nextTen = Math.ceil(total / 10) * 10;
    const expectedVerifierDigit = (nextTen - total) % 10;

    return expectedVerifierDigit === verifierDigit ? null : { invalidCedula: true };
  };
}
