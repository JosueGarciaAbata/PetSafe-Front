import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LogoComponent } from '@app/logo/logo';

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
export class RecoveryPageComponent implements OnDestroy {
  private readonly fb = new FormBuilder();
  private submitTimer: number | null = null;

  protected readonly heroImage =
    'https://images.unsplash.com/photo-1619451683243-b629e920805d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGZlbWFsZSUyMHZldGVyaW5hcmlhbiUyMGhvbGRpbmclMjBzbWlsaW5nJTIwZG9nJTIwcHVwcHklMjBtZWRpdW0lMjBzaG90JTIwd2FybSUyMGxpZ2h0fGVufDF8fHx8MTc3Mzg2OTcxM3ww';
  protected heroImageFailed = false;
  protected isSubmitted = false;
  protected isLoading = false;
  protected submittedEmail = '';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected onHeroImageError(): void {
    this.heroImageFailed = true;
  }

  protected handleSubmit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.form.controls.email.value;

    this.submitTimer = window.setTimeout(() => {
      this.isLoading = false;
      this.isSubmitted = true;
      this.submittedEmail = email;
    }, 1200);
  }

  protected resetForm(): void {
    this.isSubmitted = false;
    this.form.reset();
  }

  ngOnDestroy(): void {
    if (this.submitTimer !== null) {
      window.clearTimeout(this.submitTimer);
    }
  }
}
