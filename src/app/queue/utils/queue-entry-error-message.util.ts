import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';

export function resolveQueueEntryCreateErrorMessage(error: unknown): string {
  const message = resolveApiErrorMessage(error, {
    defaultMessage: 'No se pudo registrar el paciente en la cola. Intenta nuevamente.',
  });
  const normalized = message.toLowerCase();

  if (
    normalized.includes('lista de espera de hoy')
    || normalized.includes('ingreso activo en la cola de hoy')
    || normalized.includes('cola de hoy')
  ) {
    return 'El paciente ya se encuentra en la lista de espera de hoy.';
  }

  return message;
}
