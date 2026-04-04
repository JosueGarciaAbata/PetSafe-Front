import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  @Input() isOpen = true;

  protected readonly navItems: readonly SidebarItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'users', label: 'Propietarios', path: '/owners' },
    { icon: 'dog', label: 'Mascotas', path: '/pets' },
    { icon: 'calendar', label: 'Citas', path: '/appointments' },
    { icon: 'clock', label: 'Cola de espera', path: '/queue' },
    { icon: 'syringe', label: 'Vacunas y Trats.', path: '/treatments' },
    { icon: 'heart', label: 'Adopcion', path: '/adoption' },
    { icon: 'barChart', label: 'Reportes', path: '/reports' },
  ];
}
