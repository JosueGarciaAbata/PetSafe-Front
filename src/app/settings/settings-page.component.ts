import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthApiService } from '@app/core/auth/auth-api.service';
import {
  AuthEmailChangeConfirmResponse,
  AuthStoredUser,
  AuthUpdateProfileRequest,
  AuthUserProfileResponse,
} from '@app/core/auth/auth.model';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 20;
const NAME_PATTERN = /^[\p{L}' -]+$/u;
const PHONE_PATTERN = /^\d{10}$/;
const PHONE_LENGTH = 10;
const EMAIL_CHANGE_CODE_PATTERN = /^\d{6}$/;

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentUser: AuthStoredUser | null = null;
  protected isSaving = false;
  protected isEmailChangeOpen = false;
  protected isRequestingEmailChange = false;
  protected isConfirmingEmailChange = false;
  protected pendingNewEmail: string | null = null;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly phoneLength = PHONE_LENGTH;
  protected readonly form = this.fb.nonNullable.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(NAME_MIN_LENGTH),
        Validators.maxLength(NAME_MAX_LENGTH),
        Validators.pattern(NAME_PATTERN),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(NAME_MIN_LENGTH),
        Validators.maxLength(NAME_MAX_LENGTH),
        Validators.pattern(NAME_PATTERN),
      ],
    ],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
  });
  protected readonly emailChangeRequestForm = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
  });
  protected readonly emailChangeConfirmForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(EMAIL_CHANGE_CODE_PATTERN)]],
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
      this.toast.success(this.successMessage);
      this.form.markAsPristine();
    } catch (error: unknown) {
      this.errorMessage = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar la informacion de tu cuenta.',
        clientErrorMessage: 'Revisa los datos ingresados antes de guardar.',
        unauthorizedMessage: 'Tu sesion ya no tiene permisos para actualizar esta cuenta.',
      });
      this.toast.error(this.errorMessage);
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
      firstName: this.currentUser.nombres,
      lastName: this.currentUser.apellidos,
      phone: this.currentUser.telefono,
    });
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  protected openEmailChange(): void {
    this.isEmailChangeOpen = true;
    this.pendingNewEmail = null;
    this.emailChangeRequestForm.reset({ newEmail: '' });
    this.emailChangeConfirmForm.reset({ code: '' });
    this.cdr.markForCheck();
  }

  protected cancelEmailChange(): void {
    this.isEmailChangeOpen = false;
    this.pendingNewEmail = null;
    this.isRequestingEmailChange = false;
    this.isConfirmingEmailChange = false;
    this.emailChangeRequestForm.reset({ newEmail: '' });
    this.emailChangeConfirmForm.reset({ code: '' });
    this.cdr.markForCheck();
  }

  protected async requestEmailChange(): Promise<void> {
    if (this.isRequestingEmailChange || this.emailChangeRequestForm.invalid) {
      this.emailChangeRequestForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isRequestingEmailChange = true;
    this.cdr.markForCheck();

    try {
      const newEmail = this.emailChangeRequestForm.controls.newEmail.value.trim().toLowerCase();
      const response = await firstValueFrom(this.authApi.requestEmailChange({ newEmail }));
      this.pendingNewEmail = newEmail;
      this.emailChangeConfirmForm.reset({ code: '' });
      this.toast.success(response.message);
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo solicitar el cambio de correo.',
          clientErrorMessage: 'Revisa el correo ingresado antes de continuar.',
          unauthorizedMessage: 'Tu sesion ya no tiene permisos para realizar esta accion.',
        }),
      );
    } finally {
      this.isRequestingEmailChange = false;
      this.cdr.markForCheck();
    }
  }

  protected async confirmEmailChange(): Promise<void> {
    if (
      this.isConfirmingEmailChange ||
      !this.pendingNewEmail ||
      this.emailChangeConfirmForm.invalid
    ) {
      this.emailChangeConfirmForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isConfirmingEmailChange = true;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.authApi.confirmEmailChange({
          newEmail: this.pendingNewEmail,
          code: this.emailChangeConfirmForm.controls.code.value.trim(),
        }),
      );
      this.handleEmailChangeConfirmed(response);
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo confirmar el cambio de correo.',
          unauthorizedMessage: 'El codigo es invalido o ha expirado.',
          clientErrorMessage: 'Revisa el codigo e intenta nuevamente.',
        }),
      );
    } finally {
      this.isConfirmingEmailChange = false;
      this.cdr.markForCheck();
    }
  }

  private buildPayload(): AuthUpdateProfileRequest {
    const value = this.form.getRawValue();

    return {
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
      correo: response.email?.trim() || currentUser.correo,
      nombres: response.firstName?.trim() || payload.firstName || currentUser.nombres,
      apellidos: response.lastName?.trim() || payload.lastName || currentUser.apellidos,
      telefono: response.phone?.trim() || payload.phone || '',
      roles: Array.isArray(response.roles) ? response.roles : currentUser.roles,
      isVet: typeof response.isVet === 'boolean' ? response.isVet : currentUser.isVet,
    };
  }

  private normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private handleEmailChangeConfirmed(response: AuthEmailChangeConfirmResponse): void {
    if (response.requiresReauth) {
      this.authService.clearSession();
      this.toast.success(response.message);
      void this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    if (this.currentUser) {
      const updatedUser = { ...this.currentUser, correo: response.email };
      this.currentUser = updatedUser;
      this.authService.saveUser(updatedUser);
    }

    this.cancelEmailChange();
    this.toast.success(response.message);
  }
}
