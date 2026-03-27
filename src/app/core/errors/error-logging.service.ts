import { Injectable } from '@angular/core';
import { ErrorLogEntry } from './error-log.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorLoggingService {
  log(error: Error): ErrorLogEntry {
    const entry = this.buildEntry(error);
    console.log('[ErrorLoggingService]', entry);
    return entry;
  }

  private buildEntry(error: Error): ErrorLogEntry {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unhandled application error',
      stack: error.stack ?? null,
      currentUrl: this.getCurrentUrl(),
      timestamp: new Date().toISOString(),
    };
  }

  private getCurrentUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.location.pathname;
  }
}
