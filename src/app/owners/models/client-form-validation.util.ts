import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const CLIENT_NAME_MAX_LENGTH = 80;
export const CLIENT_DOCUMENT_ID_MAX_LENGTH = 10;
export const CLIENT_ADDRESS_MAX_LENGTH = 255;
export const CLIENT_NOTES_MAX_LENGTH = 255;
export const CLIENT_EMAIL_MAX_LENGTH = 120;
export const CLIENT_PHONE_MAX_LENGTH = 15;
export const CLIENT_PHONE_MIN_LENGTH = 7;
export const CLIENT_PHONE_PATTERN = /^\d{7,15}$/;
export const ECUADOR_CEDULA_PATTERN = /^\d{10}$/;
export const CLIENT_NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
export const CLIENT_MIN_BIRTH_DATE = buildIsoDateYearsAgo(120);
export const CLIENT_MAX_BIRTH_DATE = buildIsoDate(new Date());

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

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : control.value;
    return value ? null : { requiredTrimmed: true };
  };
}

export function trimmedMinLengthValidator(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    if (!value) {
      return null;
    }

    return value.length < minLength
      ? {
          trimmedMinLength: {
            requiredLength: minLength,
            actualLength: value.length,
          },
        }
      : null;
  };
}

export function optionalPatternValidator(pattern: RegExp, errorKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    if (!value) {
      return null;
    }

    return pattern.test(value) ? null : { [errorKey]: true };
  };
}

export function clientDateRangeValidator(minDate: string, maxDate: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    if (!value) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { invalidDate: true };
    }

    if (value < minDate) {
      return {
        minDate: {
          min: minDate,
          actual: value,
        },
      };
    }

    if (value > maxDate) {
      return {
        maxDate: {
          max: maxDate,
          actual: value,
        },
      };
    }

    return null;
  };
}

export function clientMinDateValidator(minDate: string): ValidatorFn {
  return clientDateRangeValidator(minDate, '9999-12-31');
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
