import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = (route.data['roles'] as readonly string[] | undefined) ?? [];
  const token = authService.getToken();

  if (!authService.hasValidToken(token)) {
    if (token) {
      authService.clearToken();
    }

    return router.createUrlTree(['/login']);
  }

  if (requiredRoles.length > 0 && !authService.hasAnyRole(requiredRoles, token)) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
