import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface AppToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  isClosing: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppToastService {
  private readonly closeDelayMs = 260;
  private readonly nextId = signal(1);
  readonly toasts = signal<AppToastItem[]>([]);

  success(message: string): void {
    this.open(message, 'success');
  }

  error(message: string): void {
    this.open(message, 'error');
  }

  info(message: string): void {
    this.open(message, 'info');
  }

  dismiss(id: number): void {
    let shouldScheduleRemoval = false;

    this.toasts.update((items) =>
      items.map((item) => {
        if (item.id !== id || item.isClosing) {
          return item;
        }

        shouldScheduleRemoval = true;
        return { ...item, isClosing: true };
      }),
    );

    if (!shouldScheduleRemoval) {
      return;
    }

    setTimeout(() => {
      this.toasts.update((items) => items.filter((item) => item.id !== id));
    }, this.closeDelayMs);
  }

  private open(message: string, variant: ToastVariant): void {
    const id = this.nextId();
    this.nextId.update((value) => value + 1);
    this.toasts.update((items) => [...items, {
      id,
      message,
      variant,
      isClosing: false,
    }]);

    setTimeout(() => {
      this.dismiss(id);
    }, variant === 'error' ? 5500 : 3600);
  }
}
