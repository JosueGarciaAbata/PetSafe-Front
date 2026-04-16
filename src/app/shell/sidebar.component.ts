import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '@app/logo/logo';
import { ShellIconComponent, ShellIconName } from './shell-icon.component';

interface SidebarItem {
  id: string;
  label: string;
  icon: ShellIconName;
  path?: string;
  children?: readonly SidebarChildItem[];
}

interface SidebarChildItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [LogoComponent, RouterLink, RouterLinkActive, ShellIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);
  @Input() isOpen = true;
  protected readonly expandedItemIds = new Set<string>();

  protected readonly navItems: readonly SidebarItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'owners', icon: 'users', label: 'Propietarios', path: '/owners' },
    { id: 'pets', icon: 'dog', label: 'Mascotas', path: '/pets' },
    {
      id: 'vaccination',
      icon: 'syringe',
      label: 'Vacunación',
      children: [
        { label: 'Esquemas', path: '/vaccination/schemes' },
        { label: 'Productos', path: '/vaccination/products' },
      ],
    },
    { id: 'appointments', icon: 'calendar', label: 'Citas agendadas', path: '/appointments' },
    { id: 'queue', icon: 'clock', label: 'Atención del día', path: '/queue' },
    { id: 'history', icon: 'clipboard', label: 'Historial clínico', path: '/history' },
    { id: 'adoption', icon: 'heart', label: 'Adopcion', path: '/adoption' },
    { id: 'reports', icon: 'barChart', label: 'Reportes', path: '/reports' },
    { id: 'settings', icon: 'settings', label: 'Configuracion', path: '/settings' },
  ];

  protected isGroup(item: SidebarItem): boolean {
    return (item.children?.length ?? 0) > 0;
  }

  protected isExpanded(item: SidebarItem): boolean {
    if (!this.isGroup(item)) {
      return false;
    }

    return this.expandedItemIds.has(item.id) || this.isItemActive(item);
  }

  protected toggleGroup(item: SidebarItem): void {
    if (!this.isGroup(item)) {
      return;
    }

    if (this.expandedItemIds.has(item.id)) {
      this.expandedItemIds.delete(item.id);
      return;
    }

    this.expandedItemIds.add(item.id);
  }

  protected isItemActive(item: SidebarItem): boolean {
    const currentUrl = this.router.url;

    if (item.path && (currentUrl === item.path || currentUrl.startsWith(`${item.path}/`))) {
      return true;
    }

    return item.children?.some((child) =>
      currentUrl === child.path || currentUrl.startsWith(`${child.path}/`),
    ) ?? false;
  }
}
