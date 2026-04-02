import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { OwnersApiService } from '../api/owners-api.service';
import {
  CLIENT_ADDRESS_MAX_LENGTH,
  CLIENT_DOCUMENT_ID_MAX_LENGTH,
  CLIENT_MIN_BIRTH_DATE,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  CLIENT_PHONE_PATTERN,
  clientMinDateValidator,
  ecuadorCedulaValidator,
} from '../models/client-form-validation.util';
import {
  ClientGenderCode,
  CreateClientFormValue,
  CreateClientRequest,
} from '../models/client-create.model';

@Component({
  selector: 'app-owner-create-page',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, RouterLink],
  templateUrl: './owner-create-page.component.html',
  styleUrl: './owner-create-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerCreatePageComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly router = inject(Router);

  protected readonly addressMaxLength = CLIENT_ADDRESS_MAX_LENGTH;
  protected readonly documentIdMaxLength = CLIENT_DOCUMENT_ID_MAX_LENGTH;
  protected readonly genderOptions: Array<{ value: ClientGenderCode; label: string }> = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly minBirthDate = CLIENT_MIN_BIRTH_DATE;
  protected readonly notesMaxLength = CLIENT_NOTES_MAX_LENGTH;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(CLIENT_NAME_MAX_LENGTH)]],
    lastName: ['', [Validators.required, Validators.maxLength(CLIENT_NAME_MAX_LENGTH)]],
    documentId: ['', [Validators.maxLength(CLIENT_DOCUMENT_ID_MAX_LENGTH), ecuadorCedulaValidator()]],
    gender: ['F' as ClientGenderCode],
    birthDate: ['', [clientMinDateValidator(CLIENT_MIN_BIRTH_DATE)]],
    phone: ['', [Validators.pattern(CLIENT_PHONE_PATTERN)]],
    email: ['', [Validators.email]],
    address: ['', [Validators.maxLength(CLIENT_ADDRESS_MAX_LENGTH)]],
    notes: ['', [Validators.maxLength(CLIENT_NOTES_MAX_LENGTH)]],
  });

  protected isSaving = false;
  protected errorMessage: string | null = null;

  protected async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (this.form.invalid) {
      this.errorMessage = null;
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const payload = this.buildPayload(this.form.getRawValue() as CreateClientFormValue);
      await firstValueFrom(this.ownersApi.createClient(payload));
      void this.router.navigate(['/owners']);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear el cliente. Intenta nuevamente.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
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
