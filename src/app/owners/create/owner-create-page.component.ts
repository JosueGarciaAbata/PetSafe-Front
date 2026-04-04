import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { OwnersApiService } from '../api/owners-api.service';
import { ClientTutorBasicApiResponse } from '../models/client-tutor-basic.model';
import {
  CLIENT_ADDRESS_MAX_LENGTH,
  CLIENT_DOCUMENT_ID_MAX_LENGTH,
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_MAX_BIRTH_DATE,
  CLIENT_MIN_BIRTH_DATE,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  CLIENT_NAME_PATTERN,
  CLIENT_PHONE_MAX_LENGTH,
  CLIENT_PHONE_PATTERN,
  clientDateRangeValidator,
  ecuadorCedulaValidator,
  normalizeWhitespace,
  optionalPatternValidator,
  trimmedMinLengthValidator,
  trimmedRequiredValidator,
} from '../models/client-form-validation.util';
import {
  ClientGenderCode,
  CreateClientFormValue,
  CreateClientRequest,
} from '../models/client-create.model';

@Component({
  selector: 'app-owner-create-page',
  standalone: true,
  imports: [MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, RouterLink],
  templateUrl: './owner-create-page.component.html',
  styleUrl: './owner-create-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerCreatePageComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);

  protected readonly addressMaxLength = CLIENT_ADDRESS_MAX_LENGTH;
  protected readonly documentIdMaxLength = CLIENT_DOCUMENT_ID_MAX_LENGTH;
  protected readonly emailMaxLength = CLIENT_EMAIL_MAX_LENGTH;
  protected readonly genderOptions: Array<{ value: ClientGenderCode; label: string }> = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly maxBirthDate = CLIENT_MAX_BIRTH_DATE;
  protected readonly minBirthDate = CLIENT_MIN_BIRTH_DATE;
  protected readonly nameMaxLength = CLIENT_NAME_MAX_LENGTH;
  protected readonly notesMaxLength = CLIENT_NOTES_MAX_LENGTH;
  protected readonly phoneMaxLength = CLIENT_PHONE_MAX_LENGTH;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [trimmedRequiredValidator(), trimmedMinLengthValidator(2), Validators.maxLength(CLIENT_NAME_MAX_LENGTH), optionalPatternValidator(CLIENT_NAME_PATTERN, 'invalidNamePattern')]],
    lastName: ['', [trimmedRequiredValidator(), trimmedMinLengthValidator(2), Validators.maxLength(CLIENT_NAME_MAX_LENGTH), optionalPatternValidator(CLIENT_NAME_PATTERN, 'invalidNamePattern')]],
    documentId: ['', [trimmedRequiredValidator(), Validators.maxLength(CLIENT_DOCUMENT_ID_MAX_LENGTH), ecuadorCedulaValidator()]],
    gender: ['F' as ClientGenderCode],
    birthDate: ['', [clientDateRangeValidator(CLIENT_MIN_BIRTH_DATE, CLIENT_MAX_BIRTH_DATE)]],
    phone: ['', [Validators.pattern(CLIENT_PHONE_PATTERN)]],
    email: ['', [Validators.maxLength(CLIENT_EMAIL_MAX_LENGTH), Validators.email]],
    address: ['', [Validators.maxLength(CLIENT_ADDRESS_MAX_LENGTH)]],
    notes: ['', [Validators.maxLength(CLIENT_NOTES_MAX_LENGTH)]],
  });

  protected isSaving = false;
  protected errorMessage: string | null = null;
  protected continueWithPetCreation = true;

  protected async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (this.form.invalid) {
      this.errorMessage = null;
      this.form.markAllAsTouched();
      this.toast.info('Revisa los campos obligatorios del propietario.');
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const payload = this.buildPayload(this.form.getRawValue() as CreateClientFormValue);
      const owner = await firstValueFrom(this.ownersApi.createClient(payload));
      if (this.continueWithPetCreation) {
        this.toast.success('Propietario creado. Continúa con el registro de la mascota.');
        void this.router.navigate(['/pets/new'], {
          state: {
            initialTutor: this.mapOwnerToTutor(owner),
            quickCreateForTutor: true,
            ownerBackTarget: ['/owners', owner.id],
            ownerBackLabel: 'Volver al tutor',
          },
        });
      } else {
        this.toast.success('Propietario creado correctamente.');
        void this.router.navigate(['/owners', owner.id], {
          state: {
            backTarget: ['/owners'],
            backLabel: 'Volver a propietarios',
          },
        });
      }
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo crear el cliente. Intenta nuevamente.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
      this.toast.error(this.errorMessage);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private buildPayload(value: CreateClientFormValue): CreateClientRequest {
    const payload: CreateClientRequest = {
      firstName: normalizeWhitespace(value.firstName),
      lastName: normalizeWhitespace(value.lastName),
      documentId: value.documentId.trim(),
      gender: value.gender,
    };

    const phone = value.phone.trim();
    const address = normalizeWhitespace(value.address);
    const birthDate = value.birthDate.trim();
    const notes = normalizeWhitespace(value.notes);
    const email = value.email.trim().toLowerCase();

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

  private mapOwnerToTutor(owner: {
    id: number;
    person: { firstName?: string | null; lastName?: string | null; phone?: string | null };
  }): ClientTutorBasicApiResponse {
    return {
      id: owner.id,
      firstName: owner.person.firstName?.trim() || 'Tutor',
      lastName: owner.person.lastName?.trim() || '',
      phone: owner.person.phone?.trim() || null,
    };
  }
}
