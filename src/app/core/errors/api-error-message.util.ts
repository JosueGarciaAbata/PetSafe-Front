import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorResponseBody {
  statusCode?: number;
  message?: string | readonly string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

export interface ResolveApiErrorMessageOptions {
  defaultMessage: string;
  networkMessage?: string;
  unauthorizedMessage?: string;
  clientErrorMessage?: string;
}

export function extractApiErrorMessage(body: unknown): string | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    const normalized = body.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof body !== 'object') {
    return null;
  }

  const candidate = body as ApiErrorResponseBody;
  const message = candidate.message;

  if (Array.isArray(message)) {
    const normalizedMessages = message
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return normalizedMessages.length > 0 ? normalizedMessages.join('\n') : null;
  }

  if (typeof message === 'string') {
    const normalized = message.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  if (typeof candidate.error === 'string') {
    const normalized = candidate.error.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return null;
}

export function resolveApiErrorMessage(
  error: unknown,
  options: ResolveApiErrorMessageOptions,
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return options.defaultMessage;
  }

  const backendMessage = extractApiErrorMessage(error.error);
  if (backendMessage) {
    return backendMessage;
  }

  if (error.status === 0) {
    const debugMsg = `${error.name}: ${error.message}`;
    return options.networkMessage ?? `Error de conexión: ${debugMsg}`;
  }

  if (
    (error.status === 401 || error.status === 403)
    && options.unauthorizedMessage
  ) {
    return options.unauthorizedMessage;
  }

  if (error.status >= 400 && error.status < 500 && options.clientErrorMessage) {
    return options.clientErrorMessage;
  }

  return options.defaultMessage;
}
