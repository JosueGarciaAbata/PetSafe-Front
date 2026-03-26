import { Routes } from '@angular/router';
import { authGuard } from '@app/core/auth/auth.guard';
import { ErrorPageComponent } from '@app/error-page/error-page';
import { LoginPageComponent } from '@app/login/login-page.component';

const adminRoles = ['ADMIN'] as const;

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: 'recovery',
    loadComponent: () =>
      import('@app/recovery/recovery-page.component').then((m) => m.RecoveryPageComponent),
  },
  {
    path: 'error',
    component: ErrorPageComponent,
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('@app/unauthorized/unauthorized-page.component').then(
        (m) => m.UnauthorizedPageComponent,
      ),
  },
  {
    path: '',
    loadComponent: () => import('@app/shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'owners',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/owners/owners-page.component').then((m) => m.OwnersPageComponent),
      },
      {
        path: 'pets',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'appointments',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'history',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'treatments',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'adoption',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'reports',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
