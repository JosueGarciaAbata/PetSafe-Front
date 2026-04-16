import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  Signal,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { ThemeService } from '@app/core/ui/theme.service';
import { ShellIconComponent } from './shell-icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ShellIconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly theme = inject(ThemeService);

  @Input() sidebarOpen = true;
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  protected isUserMenuOpen = false;

  protected readonly today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  private readonly currentUser = this.authService.user;

  protected readonly userName: Signal<string> = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Usuario';
    const fullName = `${user.nombres} ${user.apellidos}`.trim();
    return fullName.length > 0 ? fullName : user.correo;
  });

  protected readonly userRole: Signal<string> = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Usuario';
    return user.roles.some((role) => role.trim().toUpperCase() === 'ADMIN')
      ? 'Administrador'
      : 'Usuario';
  });

  protected readonly initials: Signal<string> = computed(() => {
    const name = this.userName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  protected toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected openSettings(): void {
    this.isUserMenuOpen = false;
    void this.router.navigateByUrl('/settings');
  }

  protected logout(): void {
    this.isUserMenuOpen = false;
    this.authService.clearSession();
    void this.router.navigateByUrl('/login');
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.isUserMenuOpen = false;
  }
}
