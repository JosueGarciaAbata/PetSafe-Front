import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '@app/core/config/api.config';

function shouldSkipAuthHeader(url: string): boolean {
  const normalizedUrl = new URL(url, API_BASE_URL).toString();

  return (
    normalizedUrl.endsWith('/auth/login') ||
    normalizedUrl.includes('/auth/password-reset/') ||
    normalizedUrl.includes('/auth/recovery') ||
    normalizedUrl.includes('/auth/forgot') ||
    normalizedUrl.includes('/auth/reset')
  );
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  if (!request.url.startsWith(API_BASE_URL) || shouldSkipAuthHeader(request.url)) {
    return next(request);
  }

  const token = authService.getToken();
  if (!token) {
    return next(request);
  }

  if (request.headers.has('Authorization')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
