import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { OwnersApiService } from '../api/owners-api.service';
import { ClientResponseApiResponse } from '../models/client-detail.model';

@Component({
  selector: 'app-create-owner-access-modal',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './create-owner-access-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOwnerAccessModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  protected isSaving = false;
  protected errorMessage: string | null = null;

  @Input({ required: true }) ownerId!: number;
  @Input() ownerName = 'propietario';

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<ClientResponseApiResponse>();

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
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const owner = await firstValueFrom(
        this.ownersApi.createClientAccess(this.ownerId, {
          email: this.form.controls.email.value.trim().toLowerCase(),
        }),
      );
      this.saved.emit(owner);
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo generar la cuenta del propietario.',
        clientErrorMessage: 'Revisa el correo ingresado.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}

