import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { OwnerApiResponse, OwnerGender } from './owner.model';

@Component({
  selector: 'app-edit-owner-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatRadioModule],
  templateUrl: './edit-owner-modal.component.html',
  styleUrl: './edit-owner-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditOwnerModalComponent {
  private _owner!: OwnerApiResponse;

  protected editGender: OwnerGender = 'Femenino';

  @Input({ required: true })
  set owner(value: OwnerApiResponse) {
    this._owner = value;
    this.editGender = value.genero;
  }

  get owner(): OwnerApiResponse {
    return this._owner;
  }

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    this.saved.emit();
  }

  protected setGender(gender: OwnerGender): void {
    this.editGender = gender;
  }
}
