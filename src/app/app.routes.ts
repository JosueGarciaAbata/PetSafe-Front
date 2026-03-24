import { Routes } from '@angular/router';
import { ErrorPageComponent } from '@app/error-page/error-page';
import { LoginPageComponent } from '@app/login/login-page.component';
import { RecoveryPageComponent } from '@app/recovery/recovery-page.component';
import { TestUiComponent } from '@app/test-ui/test-ui';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginPageComponent
  },
  {
    path: 'recovery',
    component: RecoveryPageComponent
  },
  {
    path: 'error',
    component: ErrorPageComponent
  },
  {
    path: 'test-ui',
    component: TestUiComponent
  }
];
