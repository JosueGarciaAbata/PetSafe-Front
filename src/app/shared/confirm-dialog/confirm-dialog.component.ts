import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { ShellIconComponent } from '@app/shell/shell-icon.component';

type ConfirmDialogTone = 'primary' | 'danger';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ShellIconComponent],
  template: `
    @if (open) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div
          class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          (click)="close()"
        ></div>

        <div
          class="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between border-b border-border px-6 py-5">
            <div class="flex items-start gap-4">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                [class.bg-primary/10]="tone === 'primary'"
                [class.text-primary]="tone === 'primary'"
                [class.bg-red-50]="tone === 'danger'"
                [class.text-red-600]="tone === 'danger'"
              >
                <app-shell-icon
                  [name]="tone === 'danger' ? 'alertCircle' : 'checkCircle'"
                  [size]="22"
                ></app-shell-icon>
              </div>

              <div class="space-y-2">
                <h2 [id]="titleId" class="text-xl font-bold text-text-primary">{{ title }}</h2>
                <p class="text-sm leading-6 text-text-secondary">{{ message }}</p>
              </div>
            </div>

            <button
              type="button"
              class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background"
              [disabled]="isBusy"
              (click)="close()"
              aria-label="Cerrar aviso"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>

          <div class="border-t border-border bg-background/60 px-6 py-4">
            <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition-colors hover:bg-border/50"
                [disabled]="isBusy"
                (click)="close()"
              >
                {{ cancelLabel }}
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50"
                [class.bg-primary]="tone === 'primary'"
                [class.hover:bg-primary/90]="tone === 'primary'"
                [class.bg-red-600]="tone === 'danger'"
                [class.hover:bg-red-700]="tone === 'danger'"
                [disabled]="isBusy"
                (click)="confirm()"
              >
                {{ isBusy ? busyLabel : confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Deseas continuar con esta acción?';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() busyLabel = 'Procesando...';
  @Input() tone: ConfirmDialogTone = 'primary';
  @Input() isBusy = false;

  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  protected readonly titleId = `confirm-dialog-title-${Math.random().toString(36).slice(2, 8)}`;

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isBusy) {
      this.close();
    }
  }

  protected close(): void {
    if (this.isBusy) {
      return;
    }

    this.closed.emit();
  }

  protected confirm(): void {
    if (this.isBusy) {
      return;
    }

    this.confirmed.emit();
  }
}
