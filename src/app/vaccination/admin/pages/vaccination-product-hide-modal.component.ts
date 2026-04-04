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
}
