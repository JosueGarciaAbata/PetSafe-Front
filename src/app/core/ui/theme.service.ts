import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type AppThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly storageKey = 'petsafe.theme.mode';
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<AppThemeMode>(this.readInitialMode());
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    this.applyTheme(this.mode());
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: AppThemeMode): void {
    this.mode.set(mode);
    this.persistTheme(mode);
    this.applyTheme(mode);
  }

  private readInitialMode(): AppThemeMode {
    const storedTheme = this.readStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    if (
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  private readStoredTheme(): AppThemeMode | null {
    try {
      const storedTheme = window.localStorage.getItem(ThemeService.storageKey);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    } catch {
      return null;
    }
  }

  private persistTheme(mode: AppThemeMode): void {
    try {
      window.localStorage.setItem(ThemeService.storageKey, mode);
    } catch {
      // Ignore storage errors and keep theme switching functional.
    }
  }

  private applyTheme(mode: AppThemeMode): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }

    root.dataset['theme'] = mode;
    root.style.colorScheme = mode;
  }
}
