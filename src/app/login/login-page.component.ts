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
  protected readonly pageBackgroundImage =
    'https://images.unsplash.com/photo-1771814536725-74a7caab403c?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=60&w=3000';
  protected readonly heroImage =
    'https://images.unsplash.com/photo-1768629863707-d5aeac7f68de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBkb2clMjBzbWlsaW5nJTIwYXQlMjBvd25lciUyMHdhcm0lMjBob21lJTIwbGlnaHQlMjBpbnRpbWF0ZSUyMHNjZW5lfGVufDF8fHx8MTc3Mzg2OTkxOXww';
  protected heroImageFailed = false;

  protected onHeroImageError(): void {
    this.heroImageFailed = true;
  }
}
