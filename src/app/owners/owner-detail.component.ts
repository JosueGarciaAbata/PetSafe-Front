import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EditOwnerModalComponent } from './edit-owner-modal.component';
import { OwnerApiResponse } from './owner.model';

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [EditOwnerModalComponent],
  templateUrl: './owner-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerDetailComponent {
  @Input({ required: true }) owner!: OwnerApiResponse;

  @Output() readonly back = new EventEmitter<void>();

  protected isEditOwnerModalOpen = false;

  protected goBack(): void {
    this.back.emit();
  }

  protected openEditOwnerModal(): void {
    this.isEditOwnerModalOpen = true;
  }

  protected closeEditOwnerModal(): void {
    this.isEditOwnerModalOpen = false;
  }

  protected saveEditOwnerDraft(): void {
    this.closeEditOwnerModal();
  }

  protected buildFullName(): string {
    return `${this.owner.nombre} ${this.owner.apellido}`.trim();
  }

  protected buildInitials(): string {
    return `${this.owner.nombre.charAt(0)}${this.owner.apellido.charAt(0)}`.toUpperCase();
  }
}
