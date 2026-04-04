import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-vaccination-product-hide-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vaccination-product-hide-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationProductHideModalComponent {
  @Input() open = false;
  @Input() productName = '';
  @Input() isActive = true;
  @Input() isSaving = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.closed.emit();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected confirm(): void {
    if (this.isSaving) {
      return;
    }

    this.confirmed.emit();
  }

  protected actionTitle(): string {
    return this.isActive ? 'Desactivar producto' : 'Reactivar producto';
  }

  protected actionDescription(): string {
    return this.isActive
      ? 'Este producto dejará de aparecer en nuevos flujos clínicos, pero seguirá visible en historiales y registros previos.'
      : 'Este producto volverá a estar disponible en nuevos flujos clínicos y de configuración.';
  }

  protected actionQuestionPrefix(): string {
    return this.isActive ? '¿Quieres desactivar ' : '¿Quieres reactivar ';
  }

  protected actionButtonLabel(): string {
    return this.isActive ? 'Desactivar producto' : 'Reactivar producto';
  }

  protected actionLoadingLabel(): string {
    return this.isActive ? 'Desactivando...' : 'Reactivando...';
  }

  protected actionButtonClasses(): string {
    return this.isActive
      ? 'cursor-pointer rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
      : 'cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70';
  }
}
