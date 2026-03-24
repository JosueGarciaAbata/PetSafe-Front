import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoginFormComponent } from './login-form.component';
import { LogoComponent } from '@app/logo/logo';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginFormComponent, LogoComponent],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  protected readonly heroImage =
    'https://images.unsplash.com/photo-1768629863707-d5aeac7f68de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBkb2clMjBzbWlsaW5nJTIwYXQlMjBvd25lciUyMHdhcm0lMjBob21lJTIwbGlnaHQlMjBpbnRpbWF0ZSUyMHNjZW5lfGVufDF8fHx8MTc3Mzg2OTkxOXww';
  protected heroImageFailed = false;

  protected onHeroImageError(): void {
    this.heroImageFailed = true;
  }
}
