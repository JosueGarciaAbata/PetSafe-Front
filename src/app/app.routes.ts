import { Routes } from '@angular/router';
import { authGuard } from '@app/core/auth/auth.guard';
import { ErrorPageComponent } from '@app/error-page/error-page';
import { LoginPageComponent } from '@app/login/login-page.component';

const adminRoles = ['ADMIN'] as const;
const staffRoles = ['ADMIN', 'MVZ', 'RECEPCIONISTA'] as const;
const clinicalRoles = ['ADMIN', 'MVZ'] as const;

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
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/dashboard/dashboard-page.component').then(
            (m) => m.DashboardPageComponent,
          ),

      },
      {
        path: 'owners',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/owners/list/owners-page.component').then((m) => m.OwnersPageComponent),
      },
      {
        path: 'owners/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/owners/create/owner-create-page.component').then(
            (m) => m.OwnerCreatePageComponent,
          ),
      },
      {
        path: 'owners/:id/next-steps',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/owners/create/owner-create-next-steps-page.component').then(
            (m) => m.OwnerCreateNextStepsPageComponent,
          ),
      },
      {
        path: 'owners/:id',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/owners/detail/owner-detail.component').then((m) => m.OwnerDetailComponent),
      },
      {
        path: 'owners/:id/edit',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/owners/edit/owner-edit-page.component').then(
            (m) => m.OwnerEditPageComponent,
          ),
      },
      {
        path: 'pets',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () => import('@app/pets/list/pets-page.component').then((m) => m.PetsPageComponent),
      },
      {
        path: 'pets/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/pets/create/pet-create-page.component').then((m) => m.PetCreatePageComponent),
      },
      {
        path: 'vaccination',
        redirectTo: 'vaccination/schemes',
        pathMatch: 'full',
      },
      {
        path: 'vaccination/schemes',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/vaccination/admin/pages/vaccination-schemes-page.component').then(
            (m) => m.VaccinationSchemesPageComponent,
          ),
      },
      {
        path: 'vaccination/schemes/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/vaccination/admin/pages/vaccination-scheme-create-page.component').then(
            (m) => m.VaccinationSchemeCreatePageComponent,
          ),
      },
      {
        path: 'vaccination/schemes/:id',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/vaccination/admin/pages/vaccination-scheme-detail-page.component').then(
            (m) => m.VaccinationSchemeDetailPageComponent,
          ),
      },
      {
        path: 'vaccination/schemes/:id/versions/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/vaccination/admin/pages/vaccination-scheme-version-create-page.component').then(
            (m) => m.VaccinationSchemeVersionCreatePageComponent,
          ),
      },
      {
        path: 'vaccination/products',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/vaccination/admin/pages/vaccination-products-page.component').then(
            (m) => m.VaccinationProductsPageComponent,
          ),
      },
      {
        path: 'catalogs',
        redirectTo: 'catalogs/procedures',
        pathMatch: 'full',
      },
      {
        path: 'catalogs/procedures',
        canActivate: [authGuard],
        data: { roles: staffRoles, catalogKind: 'PROCEDURE' },
        loadComponent: () =>
          import('@app/catalogs/admin/pages/catalog-items-page.component').then(
            (m) => m.CatalogItemsPageComponent,
          ),
      },
      {
        path: 'catalogs/surgeries',
        canActivate: [authGuard],
        data: { roles: staffRoles, catalogKind: 'SURGERY' },
        loadComponent: () =>
          import('@app/catalogs/admin/pages/catalog-items-page.component').then(
            (m) => m.CatalogItemsPageComponent,
          ),
      },
      {
        path: 'pets/:id/vaccination',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/pets/vaccination/pet-vaccination-page.component').then(
            (m) => m.PetVaccinationPageComponent,
          ),
      },
      {
        path: 'pets/:id',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () => import('@app/pets/detail/pet-detail.component').then((m) => m.PetDetailComponent),
      },
      {
        path: 'pets/:id/edit',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/pets/edit/pet-edit-page.component').then((m) => m.PetEditPageComponent),
      },
      {
        path: 'appointments',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/appointments/list/appointments-page.component').then(
            (m) => m.AppointmentsPageComponent,
          ),
      },
      {
        path: 'queue/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/queue/create/create-queue-entry-modal.component').then(
            (m) => m.QueueIntakePageComponent,
          ),
      },
      {
        path: 'queue',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/queue/list/queue-page.component').then((m) => m.QueuePageComponent),
      },
      {
        path: 'history',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'encounters/:id',
        canActivate: [authGuard],
        data: { roles: clinicalRoles },
        loadComponent: () =>
          import('@app/encounters/workspace/encounter-workspace-page.component').then(
            (m) => m.EncounterWorkspacePageComponent,
          ),
      },
      {
        path: 'treatments',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/internal-section-page/internal-section-page.component').then(
            (m) => m.InternalSectionPageComponent,
          ),
      },
      {
        path: 'adoption',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/adoptions/list/adoptions-page.component').then(
            (m) => m.AdoptionsPageComponent,
          ),
      },
      {
        path: 'adoption/new',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/adoptions/create/adoption-create-page.component').then(
            (m) => m.AdoptionCreatePageComponent,
          ),
      },
      {
        path: 'adoption/new/pet',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/adoptions/create/adoption-pet-create-page.component').then(
            (m) => m.AdoptionPetCreatePageComponent,
          ),
      },
      {
        path: 'adoption/:id/edit',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/adoptions/edit/adoption-edit-page.component').then(
            (m) => m.AdoptionEditPageComponent,
          ),
      },
      {
        path: 'reports',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/reports/list/reports-page.component').then(
            (m) => m.ReportsPageComponent,
          ),
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        data: { roles: staffRoles },
        loadComponent: () =>
          import('@app/settings/settings-page.component').then((m) => m.SettingsPageComponent),
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
