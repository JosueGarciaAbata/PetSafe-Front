import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '@app/logo/logo';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [LogoComponent, RouterLink],
  templateUrl: './unauthorized-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedPageComponent {}
