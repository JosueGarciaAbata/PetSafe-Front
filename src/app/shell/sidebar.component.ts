import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { LogoComponent } from '@app/logo/logo';
import { ShellIconComponent, ShellIconName } from './shell-icon.component';

interface SidebarItem {
  label: string;
  path: string;
  icon: ShellIconName;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [LogoComponent, RouterLink, RouterLinkActive, ShellIconComponent],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  @Input() isOpen = true;

  protected readonly navItems: readonly SidebarItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'users', label: 'Propietarios', path: '/owners' },
    { icon: 'dog', label: 'Mascotas', path: '/pets' },
    { icon: 'calendar', label: 'Citas', path: '/appointments' },
    { icon: 'clock', label: 'Cola de espera', path: '/queue' },
    { icon: 'clipboard', label: 'Historial Medico', path: '/history' },
    { icon: 'syringe', label: 'Vacunas y Trats.', path: '/treatments' },
    { icon: 'heart', label: 'Adopcion', path: '/adoption' },
    { icon: 'barChart', label: 'Reportes', path: '/reports' },
    { icon: 'settings', label: 'Configuracion', path: '/settings' },
  ];

  protected logout(): void {
    this.authService.clearToken();
    void this.router.navigateByUrl('/login');
  }
}
