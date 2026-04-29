import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';
import { SocketService } from '@app/core/realtime/socket.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent implements OnInit {
  private readonly socketService = inject(SocketService);

  ngOnInit(): void {
    this.socketService.connect();
  }
  protected sidebarOpen = this.loadSidebarPreference();

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.saveSidebarPreference(this.sidebarOpen);
  }

  private loadSidebarPreference(): boolean {
    try {
      const storedValue =
        typeof window !== 'undefined' ? window.localStorage.getItem('petsafe.sidebar.open') : null;

      if (storedValue === null) {
        return typeof window !== 'undefined' ? window.innerWidth >= 1280 : true;
      }

      return storedValue === 'true';
    } catch {
      return true;
    }
  }

  private saveSidebarPreference(isOpen: boolean): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('petsafe.sidebar.open', String(isOpen));
      }
    } catch {
      // Ignore storage errors and keep the toggle functional.
    }
  }
}
