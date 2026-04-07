import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthApiService } from '@app/core/auth/auth-api.service';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly validationMessages = {
    emailRequired: 'El correo es obligatorio',
    emailInvalid: 'Ingrese un correo electronico valido',
    passwordRequired: 'La contraseña es obligatoria',
  } as const;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected isSubmitting = false;
  protected loginErrorMessage = '';
  protected showValidationErrors = false;
  protected showPassword = false;

  protected submit(): void {
    this.showValidationErrors = true;

    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loginErrorMessage = '';
    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.authApiService
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.authService.saveSession(response);
          void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        },
        error: (error: unknown) => {
          this.loginErrorMessage = this.resolveLoginErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected shouldShowError(control: AbstractControl | null): boolean {
    if (!control) {
      return false;
    }

    return control.invalid && (control.touched || this.showValidationErrors);
  }

  private resolveLoginErrorMessage(error: unknown): string {
    return resolveApiErrorMessage(error, {
      defaultMessage: 'No fue posible iniciar sesion. Intenta nuevamente.',
      unauthorizedMessage: 'Credenciales invalidas.',
      clientErrorMessage: 'Revisa los datos ingresados.',
    });
  }
}
