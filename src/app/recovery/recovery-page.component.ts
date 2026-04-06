import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthApiService } from '@app/core/auth/auth-api.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { LogoComponent } from '@app/logo/logo';

type RecoveryStep = 'request' | 'verify' | 'completed';

@Component({
  selector: 'app-recovery-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    LogoComponent,
  ],
  templateUrl: './recovery-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly heroImage =
    'https://images.unsplash.com/photo-1619451683243-b629e920805d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGZlbWFsZSUyMHZldGVyaW5hcmlhbiUyMGhvbGRpbmclMjBzbWlsaW5nJTIwZG9nJTIwcHVwcHklMjBtZWRpdW0lMjBzaG90JTIwd2FybSUyMGxpZ2h0fGVufDF8fHx8MTc3Mzg2OTcxM3ww';
  protected heroImageFailed = false;

  protected currentStep: RecoveryStep = 'request';
  protected isRequestLoading = false;
  protected isResetLoading = false;
  protected requestedEmail = '';
  protected completionMessage = '';
  protected requestErrorMessage = '';
  protected verifyErrorMessage = '';
  protected showNewPassword = false;
  protected showConfirmPassword = false;

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected onHeroImageError(): void {
    this.heroImageFailed = true;
  }

  protected requestPin(): void {
    if (this.requestForm.invalid || this.isRequestLoading) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const email = this.requestForm.controls.email.value.trim();
    this.submitRecoveryRequest(email);
  }

  protected resendPin(): void {
    if (!this.requestedEmail || this.isRequestLoading) {
      return;
    }

    this.submitRecoveryRequest(this.requestedEmail, true);
  }

  protected confirmReset(): void {
    if (this.resetForm.invalid || this.hasPasswordMismatch() || this.isResetLoading) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.verifyErrorMessage = '';
    this.isResetLoading = true;
    this.resetForm.disable();
    this.cdr.markForCheck();

    this.authApiService
      .confirmPasswordReset({
        email: this.requestedEmail,
        code: this.resetForm.controls.code.value.trim(),
        newPassword: this.resetForm.controls.newPassword.value,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isResetLoading = false;
          if (this.currentStep === 'verify') {
            this.resetForm.enable();
          }
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.currentStep = 'completed';
          this.completionMessage = response.message;
        },
        error: (error: unknown) => {
          this.verifyErrorMessage = resolveApiErrorMessage(error, {
            defaultMessage: 'No fue posible restablecer la contraseña. Intenta nuevamente.',
            unauthorizedMessage: 'El PIN es inválido o ha expirado.',
            networkMessage:
              'No se pudo conectar con el servidor. Verifica que el backend esté disponible.',
            clientErrorMessage: 'Revisa el PIN y la nueva contraseña e intenta nuevamente.',
          });
        },
      });
  }

  protected goBackToRequest(): void {
    this.currentStep = 'request';
    this.requestErrorMessage = '';
    this.verifyErrorMessage = '';
    this.completionMessage = '';
    this.resetForm.reset();
    this.resetForm.enable();
    this.requestForm.enable();
    this.requestForm.controls.email.setValue(this.requestedEmail);
    this.cdr.markForCheck();
  }

  protected toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  protected hasPasswordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.resetForm.controls;
    return (
      confirmPassword.touched &&
      confirmPassword.value.length > 0 &&
      newPassword.value !== confirmPassword.value
    );
  }

  private submitRecoveryRequest(email: string, keepVerifyStep = false): void {
    this.requestErrorMessage = '';
    this.verifyErrorMessage = '';
    this.isRequestLoading = true;

    if (keepVerifyStep) {
      this.resetForm.disable();
    } else {
      this.requestForm.disable();
    }

    this.cdr.markForCheck();

    this.authApiService
      .requestPasswordReset({ email })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isRequestLoading = false;

          if (this.currentStep === 'request') {
            this.requestForm.enable();
          }

          if (this.currentStep === 'verify') {
            this.resetForm.enable();
          }

          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.currentStep = 'verify';
          this.requestedEmail = email;
          void response;
          this.resetForm.reset();
          this.resetForm.enable();
        },
        error: (error: unknown) => {
          const message = resolveApiErrorMessage(error, {
            defaultMessage: 'No fue posible procesar la recuperación. Intenta nuevamente.',
            networkMessage:
              'No se pudo conectar con el servidor de recuperación. Verifica que el backend esté disponible.',
            clientErrorMessage: 'Revisa el correo ingresado e intenta nuevamente.',
          });

          if (keepVerifyStep) {
            this.verifyErrorMessage = message;
          } else {
            this.requestErrorMessage = message;
          }
        },
      });
  }
}
