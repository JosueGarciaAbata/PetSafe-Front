import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorLoggingService } from './error-logging.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(ErrorLoggingService);
  private readonly router = inject(Router);
  private redirecting = false;

  handleError(error: unknown): void {
    const normalizedError = this.normalizeError(error);

    console.error('[GlobalErrorHandler]', normalizedError);
    this.logger.log(normalizedError);

    if (this.shouldRedirect(normalizedError)) {
      this.redirectToErrorPage();
    }
  }

  private normalizeError(error: unknown): Error {
    const unwrappedError = this.unwrapError(error);

    if (unwrappedError instanceof Error) {
      return unwrappedError;
    }

    if (this.isErrorLike(unwrappedError)) {
      return this.toError(unwrappedError);
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error('Unhandled application error');
  }

  private unwrapError(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return error;
    }

    const candidate = error as {
      ngOriginalError?: unknown;
      rejection?: unknown;
      error?: unknown;
    };

    return candidate.ngOriginalError ?? candidate.rejection ?? candidate.error ?? error;
  }

  private isErrorLike(value: unknown): value is { name?: string; message?: string; stack?: string } {
    return !!value && typeof value === 'object';
  }

  private toError(value: { name?: string; message?: string; stack?: string }): Error {
    const error = new Error(value.message || 'Unhandled application error');
    error.name = value.name || 'Error';
    error.stack = value.stack;
    return error;
  }

  private shouldRedirect(error: Error): boolean {
    const currentUrl = this.router.url || '';
    const isAlreadyOnErrorPage = currentUrl.startsWith('/error');
    const isExpectedHttpError =
      error.name === 'HttpErrorResponse' || error.message.includes('Http failure response');

    return !isAlreadyOnErrorPage && !isExpectedHttpError && !this.redirecting;
  }

  private redirectToErrorPage(): void {
    this.redirecting = true;

    void this.router.navigateByUrl('/error', { replaceUrl: true }).finally(() => {
      this.redirecting = false;
    });
  }
}
