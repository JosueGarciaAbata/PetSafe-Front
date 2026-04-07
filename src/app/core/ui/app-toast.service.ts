import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface AppToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class AppToastService {
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
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private open(message: string, variant: ToastVariant): void {
    const id = this.nextId();
    this.nextId.update((value) => value + 1);
    this.toasts.update((items) => [...items, { id, message, variant }]);

    setTimeout(() => {
      this.dismiss(id);
    }, variant === 'error' ? 5500 : 3600);
  }
}
