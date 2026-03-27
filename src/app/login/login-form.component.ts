import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthApiService } from '@app/core/auth/auth-api.service';
import { AuthService } from '@app/core/auth/auth.service';
import { AuthApiErrorResponse } from '@app/core/auth/auth.model';
import { LogoComponent } from '@app/logo/logo';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    LogoComponent,
  ],
  templateUrl: './login-form.component.html',
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
    passwordRequired: 'La contrasena es obligatoria',
  } as const;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected isSubmitting = false;
  protected loginErrorMessage = '';
  protected showPassword = false;

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
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

  private resolveLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.extractBackendErrorMessage(error.error);
      if (backendMessage) {
        return backendMessage;
      }

      if (error.status === 0) {
        return 'No fue posible conectar con el servidor. Intenta nuevamente.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Credenciales invalidas.';
      }

      if (error.status >= 400 && error.status < 500) {
        return 'Revisa los datos ingresados.';
      }
    }

    return 'No fue posible iniciar sesion. Intenta nuevamente.';
  }

  private extractBackendErrorMessage(body: unknown): string | null {
    if (!body) {
      return null;
    }

    if (typeof body === 'string') {
      const normalized = body.trim();
      return normalized.length > 0 ? normalized : null;
    }

    if (typeof body !== 'object') {
      return null;
    }

    const candidate = body as AuthApiErrorResponse;
    const message = candidate.message;

    if (Array.isArray(message)) {
      const normalizedMessages = message
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      return normalizedMessages.length > 0 ? normalizedMessages.join('\n') : null;
    }

    if (typeof message === 'string') {
      const normalized = message.trim();
      return normalized.length > 0 ? normalized : null;
    }

    return null;
  }
}
