import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '@app/core/auth/auth-api.service';
import {
  AuthStoredUser,
  AuthUpdateProfileRequest,
  AuthUserProfileResponse,
} from '@app/core/auth/auth.model';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';

const NAME_PATTERN = /^[A-Za-zÀ-ÿ' -]+$/;
const PHONE_PATTERN = /^\d{7,15}$/;
const NAME_MAX_LENGTH = 60;
const EMAIL_MAX_LENGTH = 120;
const PHONE_MAX_LENGTH = 15;

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentUser: AuthStoredUser | null = null;
  protected isSaving = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly emailMaxLength = EMAIL_MAX_LENGTH;
  protected readonly phoneMaxLength = PHONE_MAX_LENGTH;
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(NAME_MAX_LENGTH),
        Validators.pattern(NAME_PATTERN),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(NAME_MAX_LENGTH),
        Validators.pattern(NAME_PATTERN),
      ],
    ],
    phone: ['', [Validators.maxLength(PHONE_MAX_LENGTH), Validators.pattern(PHONE_PATTERN)]],
  });

  ngOnInit(): void {
    const user = this.authService.getUser();

    if (!user) {
      this.errorMessage = 'No se encontro una sesion activa para editar esta cuenta.';
      this.form.disable();
      this.cdr.markForCheck();
      return;
    }

    this.currentUser = user;
    this.resetForm();
  }

  protected async save(): Promise<void> {
    if (!this.currentUser || this.isSaving || this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      const payload = this.buildPayload();
      const response = await firstValueFrom(this.authApi.updateProfile(this.currentUser.id, payload));
      const updatedUser = this.mergeUpdatedUser(payload, response);

      this.currentUser = updatedUser;
      this.authService.saveUser(updatedUser);
      this.successMessage = 'Los datos de tu cuenta se actualizaron correctamente.';
      this.form.markAsPristine();
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar la informacion de tu cuenta.',
        clientErrorMessage: 'Revisa los datos ingresados antes de guardar.',
        unauthorizedMessage: 'Tu sesion ya no tiene permisos para actualizar esta cuenta.',
      });
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected resetForm(): void {
    if (!this.currentUser) {
      return;
    }

    this.form.reset({
      email: this.currentUser.correo,
      firstName: this.currentUser.nombres,
      lastName: this.currentUser.apellidos,
      phone: this.currentUser.telefono,
    });
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  protected getRoleLabel(): string {
    if (!this.currentUser) {
      return 'Usuario';
    }

    if (this.currentUser.roles.some((role) => role.trim().toUpperCase() === 'ADMIN')) {
      return 'Administrador';
    }

    return this.currentUser.isVet ? 'Medico veterinario' : 'Usuario interno';
  }

  private buildPayload(): AuthUpdateProfileRequest {
    const value = this.form.getRawValue();

    return {
      email: value.email.trim(),
      firstName: this.normalizeWhitespace(value.firstName),
      lastName: this.normalizeWhitespace(value.lastName),
      phone: value.phone.trim() || undefined,
    };
  }

  private mergeUpdatedUser(
    payload: AuthUpdateProfileRequest,
    response: AuthUserProfileResponse,
  ): AuthStoredUser {
    const currentUser = this.currentUser;

    if (!currentUser) {
      throw new Error('Current user is required to merge profile changes.');
    }

    return {
      id: String(response.id ?? currentUser.id),
      correo: response.email?.trim() || payload.email,
      nombres: response.firstName?.trim() || payload.firstName,
      apellidos: response.lastName?.trim() || payload.lastName,
      telefono: response.phone?.trim() || payload.phone || '',
      roles: Array.isArray(response.roles) ? response.roles : currentUser.roles,
      isVet: typeof response.isVet === 'boolean' ? response.isVet : currentUser.isVet,
    };
  }

  private normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
