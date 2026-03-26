import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { OwnersApiService } from '../api/owners-api.service';
import {
  ClientGenderCode,
  CreateClientFormValue,
  CreateClientRequest,
} from '../models/client-create.model';

@Component({
  selector: 'app-create-owner-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './create-owner-modal.component.html',
  styleUrl: './create-owner-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOwnerModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ownersApi = inject(OwnersApiService);

  protected readonly genderOptions: Array<{ value: ClientGenderCode; label: string }> = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    documentId: [''],
    gender: ['F' as ClientGenderCode],
    birthDate: [''],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
    notes: [''],
  });

  protected isSaving = false;
  protected errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (this.form.invalid) {
      this.errorMessage = null;
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const payload = this.buildPayload(this.form.getRawValue() as CreateClientFormValue);
      await firstValueFrom(this.ownersApi.createClient(payload));
      this.saved.emit();
    } catch {
      this.errorMessage = 'No se pudo crear el cliente. Intenta nuevamente.';
    } finally {
      this.isSaving = false;
    }
  }

  private buildPayload(value: CreateClientFormValue): CreateClientRequest {
    const payload: CreateClientRequest = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      gender: value.gender,
    };

    const documentId = value.documentId.trim();
    const phone = value.phone.trim();
    const address = value.address.trim();
    const birthDate = value.birthDate.trim();
    const notes = value.notes.trim();
    const email = value.email.trim();

    if (documentId) {
      payload.documentId = documentId;
    }

    if (phone) {
      payload.phone = phone;
    }

    if (address) {
      payload.address = address;
    }

    if (birthDate) {
      payload.birthDate = birthDate;
    }

    if (notes) {
      payload.notes = notes;
    }

    if (email) {
      payload.user = { email };
    }

    return payload;
  }
}
