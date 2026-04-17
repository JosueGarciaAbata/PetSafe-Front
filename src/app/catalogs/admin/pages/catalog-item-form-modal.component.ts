import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogAdminFormPayload, CatalogAdminItem, CatalogAdminKind } from '../models/catalog-admin.model';

@Component({
  selector: 'app-catalog-item-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-item-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() catalogKind: CatalogAdminKind = 'PROCEDURE';
  @Input() item: CatalogAdminItem | null = null;
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<CatalogAdminFormPayload>();

  protected name = '';
  protected description = '';
  protected requiresAnesthesia = false;
  protected showValidationErrors = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['open']?.currentValue === true && changes['open']?.previousValue !== true)
      || changes['item']
      || changes['catalogKind']
    ) {
      this.resetForm();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.close();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected submit(): void {
    this.showValidationErrors = true;

    const name = this.name.trim();
    if (!name) {
      return;
    }

    const payload: CatalogAdminFormPayload = {
      name,
      description: this.description.trim() || undefined,
    };

    if (this.catalogKind === 'SURGERY') {
      payload.requiresAnesthesia = this.requiresAnesthesia;
    }

    this.saved.emit(payload);
  }

  protected modalTitle(): string {
    if (this.catalogKind === 'SURGERY') {
      return this.item ? 'Editar cirugía' : 'Nueva cirugía';
    }

    return this.item ? 'Editar procedimiento' : 'Nuevo procedimiento';
  }

  protected modalDescription(): string {
    if (this.catalogKind === 'SURGERY') {
      return this.item
        ? 'Actualiza la cirugía del catálogo clínico.'
        : 'Registra una nueva cirugía para los flujos clínicos.';
    }

    return this.item
      ? 'Actualiza el procedimiento del catálogo clínico.'
      : 'Registra un nuevo procedimiento para los flujos clínicos.';
  }

  protected descriptionLabel(): string {
    return this.catalogKind === 'SURGERY' ? 'Detalles clínicos' : 'Descripción';
  }

  protected hasNameError(): boolean {
    return this.showValidationErrors && !this.name.trim();
  }

  protected shouldShowAnesthesia(): boolean {
    return this.catalogKind === 'SURGERY';
  }

  private resetForm(): void {
    this.showValidationErrors = false;
    this.name = this.item?.name ?? '';
    this.description = this.item?.description ?? '';
    this.requiresAnesthesia = this.item?.requiresAnesthesia ?? false;
  }
}
