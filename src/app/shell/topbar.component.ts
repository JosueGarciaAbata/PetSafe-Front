import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { ShellIconComponent } from './shell-icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ShellIconComponent],
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  private readonly authService = inject(AuthService);
  @Input() sidebarOpen = true;
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  protected readonly today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  protected readonly userName = this.resolveUserName();
  protected readonly userRole = this.resolveUserRole();

  private resolveUserName(): string {
    const user = this.authService.getUser();

    if (!user) {
      return 'Usuario';
    }

    const fullName = `${user.nombres} ${user.apellidos}`.trim();
    return fullName.length > 0 ? fullName : user.correo;
  }

  private resolveUserRole(): string {
    return this.authService.hasAnyRole(['ADMIN']) ? 'Administrador' : 'Usuario';
  }
}
