import { Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AuthJwtPayload, AuthLoginResponse, AuthStoredUser } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly accessTokenKey = 'petsafe.auth.access-token';
  private static readonly userKey = 'petsafe.auth.user';

  readonly user = signal<AuthStoredUser | null>(this.readStoredUser());

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

  saveUser(user: AuthStoredUser): void {
    localStorage.setItem(AuthService.userKey, JSON.stringify(user));
    this.user.set(user);
  }

  saveSession(session: AuthLoginResponse): void {
    this.saveAccessToken(session.accessToken);
    this.saveUser(this.mapUser(session.user));
  }

  clearToken(): void {
    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem(AuthService.accessTokenKey);
    localStorage.removeItem(AuthService.userKey);
    this.user.set(null);
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

  getUser(): AuthStoredUser | null {
    return this.user();
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

  private mapUser(user: AuthLoginResponse['user']): AuthStoredUser {
    return {
      id: String(user.id),
      correo: user.email,
      nombres: user.firstName,
      apellidos: user.lastName,
      telefono: user.phone?.trim() ?? '',
      roles: user.roles,
      isVet: user.isVet,
    };
  }

  private readStoredUser(): AuthStoredUser | null {
    const storedUser = localStorage.getItem(AuthService.userKey);

    if (!storedUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as Record<string, unknown>;

      if (!parsedUser || typeof parsedUser !== 'object') {
        return null;
      }

      const id = parsedUser['id'];
      const correo = parsedUser['correo'] ?? parsedUser['email'];
      const nombres = parsedUser['nombres'] ?? parsedUser['firstName'];
      const apellidos = parsedUser['apellidos'] ?? parsedUser['lastName'];
      const telefono = parsedUser['telefono'] ?? parsedUser['phone'] ?? '';
      const roles = parsedUser['roles'];
      const isVet = parsedUser['isVet'];

      if (
        (typeof id !== 'string' && typeof id !== 'number') ||
        typeof correo !== 'string' ||
        typeof nombres !== 'string' ||
        typeof apellidos !== 'string' ||
        typeof telefono !== 'string' ||
        !Array.isArray(roles) ||
        typeof isVet !== 'boolean'
      ) {
        return null;
      }

      return {
        id: String(id),
        correo,
        nombres,
        apellidos,
        telefono,
        roles: roles.filter((value): value is string => typeof value === 'string'),
        isVet,
      };
    } catch {
      return null;
    }
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
