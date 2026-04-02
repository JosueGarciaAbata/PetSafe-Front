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
          import('@app/owners/list/owners-page.component').then((m) => m.OwnersPageComponent),
      },
      {
        path: 'owners/new',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/owners/create/owner-create-page.component').then(
            (m) => m.OwnerCreatePageComponent,
          ),
      },
      {
        path: 'owners/:id',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/owners/detail/owner-detail.component').then((m) => m.OwnerDetailComponent),
      },
      {
        path: 'owners/:id/edit',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/owners/edit/owner-edit-page.component').then(
            (m) => m.OwnerEditPageComponent,
          ),
      },
      {
        path: 'pets',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () => import('@app/pets/list/pets-page.component').then((m) => m.PetsPageComponent),
      },
      {
        path: 'pets/new',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/pets/create/pet-create-page.component').then((m) => m.PetCreatePageComponent),
      },
      {
        path: 'pets/:id',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () => import('@app/pets/detail/pet-detail.component').then((m) => m.PetDetailComponent),
      },
      {
        path: 'pets/:id/edit',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/pets/edit/pet-edit-page.component').then((m) => m.PetEditPageComponent),
      },
      {
        path: 'appointments',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/appointments/list/appointments-page.component').then(
            (m) => m.AppointmentsPageComponent,
          ),
      },
      {
        path: 'queue/new',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/queue/create/create-queue-entry-modal.component').then(
            (m) => m.QueueIntakePageComponent,
          ),
      },
      {
        path: 'queue',
        canActivate: [authGuard],
        data: { roles: adminRoles },
        loadComponent: () =>
          import('@app/queue/list/queue-page.component').then((m) => m.QueuePageComponent),
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
