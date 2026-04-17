import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '@app/logo/logo';
import { ShellIconComponent, ShellIconName } from './shell-icon.component';

interface SidebarLeafItem {
  label: string;
  path: string;
}

interface SidebarChildItem {
  id?: string;
  label: string;
  path?: string;
  children?: readonly SidebarLeafItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: ShellIconName;
  path?: string;
  children?: readonly SidebarChildItem[];
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
  protected readonly collapsedItemIds = new Set<string>();
  protected readonly expandedChildIds = new Set<string>();
  protected readonly collapsedChildIds = new Set<string>();

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
    {
      id: 'catalogs',
      icon: 'folder',
      label: 'Catálogos',
      children: [
        { label: 'Procedimientos', path: '/catalogs/procedures' },
        { label: 'Cirugías', path: '/catalogs/surgeries' },
      ],
    },
    { id: 'treatments', icon: 'syringe', label: 'Tratamientos', path: '/treatments' },
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

  protected isChildGroup(child: SidebarChildItem): boolean {
    return (child.children?.length ?? 0) > 0;
  }

  protected isChildExpanded(child: SidebarChildItem): boolean {
    if (!this.isChildGroup(child)) return false;
    if (this.expandedChildIds.has(child.id!)) return true;
    if (this.collapsedChildIds.has(child.id!)) return false;
    return this.hasActiveGrandchild(child);
  }

  protected toggleChildGroup(child: SidebarChildItem): void {
    if (!this.isChildGroup(child)) return;
    const id = child.id!;
    if (this.expandedChildIds.has(id)) {
      this.expandedChildIds.delete(id);
      this.collapsedChildIds.add(id);
      return;
    }
    this.collapsedChildIds.delete(id);
    this.expandedChildIds.add(id);
  }

  protected hasActiveGrandchild(child: SidebarChildItem): boolean {
    const currentUrl = this.router.url;
    return child.children?.some(
      (gc) => currentUrl === gc.path || currentUrl.startsWith(`${gc.path}/`),
    ) ?? false;
  }

  protected isExpanded(item: SidebarItem): boolean {
    if (!this.isGroup(item)) {
      return false;
    }

    if (this.expandedItemIds.has(item.id)) {
      return true;
    }

    if (this.collapsedItemIds.has(item.id)) {
      return false;
    }

    return this.hasActiveChild(item);
  }

  protected toggleGroup(item: SidebarItem): void {
    if (!this.isGroup(item)) {
      return;
    }

    if (this.expandedItemIds.has(item.id)) {
      this.expandedItemIds.delete(item.id);
      this.collapsedItemIds.add(item.id);
      return;
    }

    this.collapsedItemIds.delete(item.id);
    this.expandedItemIds.add(item.id);
  }

  protected isItemActive(item: SidebarItem): boolean {
    const currentUrl = this.router.url;

    if (item.path && (currentUrl === item.path || currentUrl.startsWith(`${item.path}/`))) {
      return true;
    }

    return false;
  }

  protected hasActiveChild(item: SidebarItem): boolean {
    const currentUrl = this.router.url;

    return item.children?.some((child) => {
      if (child.path && (currentUrl === child.path || currentUrl.startsWith(`${child.path}/`))) {
        return true;
      }
      return this.hasActiveGrandchild(child);
    }) ?? false;
  }
}
