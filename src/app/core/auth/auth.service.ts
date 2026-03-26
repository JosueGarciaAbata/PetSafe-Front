import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AuthJwtPayload, AuthLoginResponse, AuthUserDto } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly accessTokenKey = 'petsafe.auth.access-token';
  private static readonly userKey = 'petsafe.auth.user';

  getToken(): string | null {
    return localStorage.getItem(AuthService.accessTokenKey);
  }

  saveToken(token: string): void {
    this.saveAccessToken(token);
  }

  saveAccessToken(token: string): void {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      this.clearToken();
      return;
    }

    localStorage.setItem(AuthService.accessTokenKey, normalizedToken);
  }

  saveUser(user: AuthUserDto): void {
    localStorage.setItem(AuthService.userKey, JSON.stringify(user));
  }

  saveSession(session: AuthLoginResponse): void {
    this.saveAccessToken(session.access_token);
    this.saveUser(session.usuario);
  }

  clearToken(): void {
    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem(AuthService.accessTokenKey);
    localStorage.removeItem(AuthService.userKey);
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  hasValidToken(token: string | null = this.getToken()): boolean {
    const payload = this.decodeToken(token);
    return payload !== null && !this.isExpired(payload);
  }

  getPayload(token: string | null = this.getToken()): AuthJwtPayload | null {
    return this.decodeToken(token);
  }

  getUser(): AuthUserDto | null {
    const storedUser = localStorage.getItem(AuthService.userKey);

    if (!storedUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUserDto;

      if (
        !parsedUser ||
        typeof parsedUser !== 'object' ||
        typeof parsedUser.id !== 'string' ||
        typeof parsedUser.correo !== 'string' ||
        typeof parsedUser.nombres !== 'string' ||
        typeof parsedUser.apellidos !== 'string'
      ) {
        return null;
      }

      return parsedUser;
    } catch {
      return null;
    }
  }

  getRoles(token: string | null = this.getToken()): string[] {
    const payload = this.decodeToken(token);
    if (!payload) {
      return [];
    }

    return this.extractRoles(payload);
  }

  hasAnyRole(requiredRoles: readonly string[], token: string | null = this.getToken()): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }

    const currentRoles = new Set(this.getRoles(token));
    return requiredRoles.some((role) => currentRoles.has(this.normalizeRole(role)));
  }

  private decodeToken(token: string | null): AuthJwtPayload | null {
    if (!token) {
      return null;
    }

    try {
      const payload = jwtDecode<AuthJwtPayload>(token);
      return payload === null || typeof payload !== 'object' ? null : payload;
    } catch {
      return null;
    }
  }

  private extractRoles(payload: AuthJwtPayload): string[] {
    const candidate = payload.roles ?? [];

    if (Array.isArray(candidate)) {
      return candidate
        .filter((value): value is string => typeof value === 'string')
        .map((value) => this.normalizeRole(value))
        .filter((value) => value.length > 0);
    }

    if (typeof candidate === 'string') {
      const normalized = this.normalizeRole(candidate);
      return normalized ? [normalized] : [];
    }

    return [];
  }

  private normalizeRole(value: string): string {
    return value.trim().toUpperCase();
  }

  private isExpired(payload: AuthJwtPayload): boolean {
    if (typeof payload.exp !== 'number') {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  }
}
