import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthMessageResponse,
  AuthPasswordResetConfirmRequest,
  AuthPasswordResetRequest,
  AuthUpdateProfileRequest,
  AuthUserProfileResponse,
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = buildApiUrl('auth/login');
  private readonly passwordResetRequestUrl = buildApiUrl('auth/password-reset/request');
  private readonly passwordResetConfirmUrl = buildApiUrl('auth/password-reset/confirm');

  login(payload: AuthLoginRequest): Observable<AuthLoginResponse> {
    return this.http.post<AuthLoginResponse>(this.loginUrl, payload);
  }

  requestPasswordReset(payload: AuthPasswordResetRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(this.passwordResetRequestUrl, payload);
  }

  confirmPasswordReset(payload: AuthPasswordResetConfirmRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(this.passwordResetConfirmUrl, payload);
  }

  updateProfile(
    id: string | number,
    payload: AuthUpdateProfileRequest,
  ): Observable<AuthUserProfileResponse> {
    return this.http.patch<AuthUserProfileResponse>(
      buildApiUrl(`users/${encodeURIComponent(String(id))}`),
      payload,
    );
  }
}
