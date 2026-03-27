import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  mapClientGenderLabel,
} from '../models/client-summary.model';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import {
  CLIENT_ADDRESS_MAX_LENGTH,
  CLIENT_MIN_BIRTH_DATE,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  CLIENT_PHONE_PATTERN,
  clientMinDateValidator,
} from '../models/client-form-validation.util';
import { ClientGenderCode, UpdateClientRequest } from '../models/client-update.model';

interface EditOwnerFormValue {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  gender: ClientGenderCode;
  birthDate: string;
  notes: string;
}

@Component({
  selector: 'app-edit-owner-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './edit-owner-modal.component.html',
  styleUrl: './edit-owner-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditOwnerModalComponent {
  private readonly fb = inject(FormBuilder);
  private _owner!: ClientResponseApiResponse;

  protected readonly addressMaxLength = CLIENT_ADDRESS_MAX_LENGTH;
  protected readonly genderOptions: Array<{ value: ClientGenderCode; label: string }> = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly minBirthDate = CLIENT_MIN_BIRTH_DATE;
  protected readonly nameMaxLength = CLIENT_NAME_MAX_LENGTH;
  protected readonly notesMaxLength = CLIENT_NOTES_MAX_LENGTH;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(CLIENT_NAME_MAX_LENGTH)]],
    lastName: ['', [Validators.required, Validators.maxLength(CLIENT_NAME_MAX_LENGTH)]],
    phone: ['', [Validators.pattern(CLIENT_PHONE_PATTERN)]],
    address: ['', [Validators.maxLength(CLIENT_ADDRESS_MAX_LENGTH)]],
    gender: ['F' as ClientGenderCode],
    birthDate: ['', [clientMinDateValidator(CLIENT_MIN_BIRTH_DATE)]],
    notes: ['', [Validators.maxLength(CLIENT_NOTES_MAX_LENGTH)]],
  });

  @Input({ required: true })
  set owner(value: ClientResponseApiResponse) {
    this._owner = value;
    this.form.setValue({
      firstName: value.person.firstName ?? '',
      lastName: value.person.lastName ?? '',
      phone: value.person.phone ?? '',
      address: value.person.address ?? '',
      gender: this.mapGenderCode(mapClientGenderLabel(value.person.gender)),
      birthDate: value.person.birthDate ? value.person.birthDate.slice(0, 10) : '',
      notes: value.notes ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  get owner(): ClientResponseApiResponse {
    return this._owner;
  }

  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<UpdateClientRequest>();

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected save(): void {
    if (this.isSaving) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saved.emit(this.buildPayload(this.form.getRawValue() as EditOwnerFormValue));
  }

  private buildPayload(value: EditOwnerFormValue): UpdateClientRequest {
    const birthDate = value.birthDate.trim();

    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim(),
      address: value.address.trim(),
      gender: value.gender,
      birthDate: birthDate || undefined,
      notes: value.notes.trim(),
    };
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
