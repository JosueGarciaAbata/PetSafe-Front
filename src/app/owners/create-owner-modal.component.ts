import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { OwnerGender } from './owner.model';

@Component({
  selector: 'app-create-owner-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatRadioModule],
  templateUrl: './create-owner-modal.component.html',
  styleUrl: './create-owner-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOwnerModalComponent {
  @Input({ required: true }) gender: OwnerGender = 'Femenino';

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly genderChange = new EventEmitter<OwnerGender>();

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    this.saved.emit();
  }

  protected setGender(gender: OwnerGender): void {
    this.genderChange.emit(gender);
  }
}
