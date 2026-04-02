import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, CannotCreateEntityIdMapError } from 'typeorm';

// ── Response shape ───────────────────────────────────
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// ── PostgreSQL error‐code → friendly response ───────
interface PgErrorMapping {
  status: number;
  error: string;
  message: string;
}

const PG_ERROR_MAP: Record<string, PgErrorMapping> = {
  '23505': {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'El recurso ya existe o viola una restricción de unicidad',
  },
  '23503': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Referencia a un recurso que no existe',
  },
  '23502': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Faltan campos obligatorios en la operación',
  },
  '23514': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'El valor proporcionado no cumple las restricciones de la base de datos',
  },
  '22P02': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Formato de dato inválido',
  },
  '22003': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'El valor numérico está fuera de rango',
  },
  '42703': {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Se hace referencia a un campo inexistente',
  },
  '42P01': {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    message: 'Error interno: recurso de base de datos no encontrado',
  },
  '40P01': {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Conflicto de concurrencia, intente de nuevo',
  },
  '40001': {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Conflicto de serialización, intente de nuevo',
  },
  '57014': {
    status: HttpStatus.REQUEST_TIMEOUT,
    error: 'Request Timeout',
    message: 'La consulta tardó demasiado y fue cancelada',
  },
};

// ── Handlers ─────────────────────────────────────────

function handleHttpException(exception: HttpException): Pick<ErrorResponse, 'statusCode' | 'message' | 'error'> {
  const status = exception.getStatus();
  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    return { statusCode: status, message: exceptionResponse, error: exception.name };
  }

  const res = exceptionResponse as Record<string, unknown>;
  return {
    statusCode: status,
    message: (res.message as string | string[]) ?? exception.message,
    error: (res.error as string) ?? exception.name,
  };
}

function handleQueryFailed(
  exception: QueryFailedError,
  logger: Logger,
): Pick<ErrorResponse, 'statusCode' | 'message' | 'error'> {
  const pgError = exception as QueryFailedError & {
    code?: string;
    detail?: string;
    constraint?: string;
  };

  logger.error(
    `DB Error [${pgError.code}] ${pgError.constraint ?? ''}: ${pgError.message}`,
    exception.stack,
  );

  const mapping = pgError.code ? PG_ERROR_MAP[pgError.code] : undefined;

  if (mapping) {
    return { statusCode: mapping.status, message: mapping.message, error: mapping.error };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Error interno de base de datos',
    error: 'Internal Server Error',
  };
}

function handleEntityNotFound(): Pick<ErrorResponse, 'statusCode' | 'message' | 'error'> {
  return {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'El recurso solicitado no fue encontrado',
    error: 'Not Found',
  };
}

function handleUnknown(
  exception: unknown,
  logger: Logger,
): Pick<ErrorResponse, 'statusCode' | 'message' | 'error'> {
  logger.error(
    'Unhandled exception',
    exception instanceof Error ? exception.stack : String(exception),
  );

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Error interno del servidor',
    error: 'Internal Server Error',
  };
}

// ── Filter ───────────────────────────────────────────

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const result = this.resolve(exception);

    const body: ErrorResponse = {
      ...result,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(result.statusCode).json(body);
  }

  private resolve(
    exception: unknown,
  ): Pick<ErrorResponse, 'statusCode' | 'message' | 'error'> {
    if (exception instanceof HttpException) {
      return handleHttpException(exception);
    }

    if (exception instanceof QueryFailedError) {
      return handleQueryFailed(exception, this.logger);
    }

    if (exception instanceof EntityNotFoundError) {
      return handleEntityNotFound();
    }

    if (exception instanceof CannotCreateEntityIdMapError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Identificador de entidad inválido',
        error: 'Bad Request',
      };
    }

    return handleUnknown(exception, this.logger);
  }
}
