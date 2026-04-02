import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { OwnersApiService } from '../api/owners-api.service';
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
import { mapClientGenderLabel } from '../models/client-summary.model';

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
  selector: 'app-owner-edit-page',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './owner-edit-page.component.html',
  styleUrl: './owner-edit-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerEditPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private ownerId = '';
  private returnToOwnersListAfterDetail = false;

  protected owner: ClientResponseApiResponse | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected loadError: string | null = null;
  protected errorMessage: string | null = null;
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

  ngOnInit(): void {
    const ownerId = this.route.snapshot.paramMap.get('id');
    if (!ownerId) {
      void this.router.navigate(['/owners']);
      return;
    }

    this.ownerId = ownerId;
    this.returnToOwnersListAfterDetail = history.state?.returnToOwnersListAfterDetail === true;
    void this.loadOwner();
  }

  protected async save(): Promise<void> {
    if (this.isSaving || this.form.invalid || !this.owner) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const payload = this.buildPayload(this.form.getRawValue() as EditOwnerFormValue);
      await firstValueFrom(this.ownersApi.updateClient(this.owner.id, payload));
      void this.navigateToOwnerDetail();
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar el propietario.',
        clientErrorMessage: 'Revisa los datos ingresados.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async loadOwner(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    try {
      const owner = await firstValueFrom(this.ownersApi.getClientById(this.ownerId));
      this.owner = owner;
      this.form.setValue({
        firstName: owner.person.firstName ?? '',
        lastName: owner.person.lastName ?? '',
        phone: owner.person.phone ?? '',
        address: owner.person.address ?? '',
        gender: this.mapGenderCode(mapClientGenderLabel(owner.person.gender)),
        birthDate: owner.person.birthDate ? owner.person.birthDate.slice(0, 10) : '',
        notes: owner.notes ?? '',
      });
    } catch {
      this.loadError = 'No se pudo cargar el propietario.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
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

  protected cancel(): void {
    if (!this.owner) {
      void this.router.navigate(['/owners']);
      return;
    }

    void this.navigateToOwnerDetail();
  }

  private navigateToOwnerDetail(): Promise<boolean> {
    return this.router.navigate(['/owners', this.ownerId], {
      replaceUrl: true,
      state: {
        forceBackToOwnersList: this.returnToOwnersListAfterDetail,
      },
    });
  }
}
