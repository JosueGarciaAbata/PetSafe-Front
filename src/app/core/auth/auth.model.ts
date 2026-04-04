export interface AuthJwtPayload {
  sub?: string;
  correo?: string;
  email?: string;
  exp?: number;
  iat?: number;
  roles?: string | readonly string[];
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user: AuthLoginUserResponse;
}

export interface AuthLoginUserResponse {
  id: number;
  email: string;
  roles: readonly string[];
  firstName: string;
  lastName: string;
  phone?: string | null;
  isVet: boolean;
}

export interface AuthStoredUser {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  roles: readonly string[];
  isVet: boolean;
}

export interface AuthUpdateProfileRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthUserProfileResponse {
  id?: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  roles?: readonly string[];
  isVet?: boolean;
}

export interface AuthApiErrorResponse {
  statusCode?: number;
  message?: string | readonly string[];
  error?: string;
  timestamp?: string;
  path?: string;
}
