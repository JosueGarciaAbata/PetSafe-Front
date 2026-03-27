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
  isVet: boolean;
}

export interface AuthStoredUser {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  roles: readonly string[];
  isVet: boolean;
}

export interface AuthApiErrorResponse {
  statusCode?: number;
  message?: string | readonly string[];
  error?: string;
  timestamp?: string;
  path?: string;
}
