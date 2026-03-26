import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  mapClientGenderLabel,
} from '../models/client-summary.model';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import { ClientGenderCode, UpdateClientRequest } from '../models/client-update.model';

@Component({
  selector: 'app-edit-owner-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './edit-owner-modal.component.html',
  styleUrl: './edit-owner-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditOwnerModalComponent {
  private _owner!: ClientResponseApiResponse;

  protected readonly genderOptions: Array<{ value: ClientGenderCode; label: string }> = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected editGender: ClientGenderCode = 'F';
  protected firstName = '';
  protected lastName = '';
  protected phone = '';
  protected address = '';
  protected birthDate = '';
  protected notes = '';

  @Input({ required: true })
  set owner(value: ClientResponseApiResponse) {
    this._owner = value;
    this.firstName = value.person.firstName ?? '';
    this.lastName = value.person.lastName ?? '';
    this.phone = value.person.phone ?? '';
    this.address = value.person.address ?? '';
    this.editGender = this.mapGenderCode(mapClientGenderLabel(value.person.gender));
    this.birthDate = value.person.birthDate ? value.person.birthDate.slice(0, 10) : '';
    this.notes = value.notes ?? '';
  }

  get owner(): ClientResponseApiResponse {
    return this._owner;
  }

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<UpdateClientRequest>();

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    this.saved.emit({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phone: this.phone.trim(),
      address: this.address.trim(),
      gender: this.editGender,
      birthDate: this.birthDate || undefined,
      notes: this.notes.trim(),
    });
  }

  protected setGender(gender: ClientGenderCode): void {
    this.editGender = gender;
  }

  protected setFirstName(value: string): void {
    this.firstName = value;
  }

  protected setLastName(value: string): void {
    this.lastName = value;
  }

  protected setPhone(value: string): void {
    this.phone = value;
  }

  protected setAddress(value: string): void {
    this.address = value;
  }

  protected setBirthDate(value: string): void {
    this.birthDate = value;
  }

  protected setNotes(value: string): void {
    this.notes = value;
  }

  private mapGenderCode(gender: string): ClientGenderCode {
    switch (gender) {
      case 'Masculino':
        return 'M';
      case 'Otro':
        return 'OTRO';
      case 'Femenino':
      default:
        return 'F';
    }
  }
}
