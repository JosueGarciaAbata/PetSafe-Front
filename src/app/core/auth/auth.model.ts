export interface AuthJwtPayload {
  sub?: string;
  correo?: string;
  exp?: number;
  iat?: number;
  roles?: string | readonly string[];
}

export interface AuthLoginRequest {
  correo: string;
  password: string;
}

export interface AuthLoginResponse {
  access_token: string;
  usuario: AuthUserDto;
}

export interface AuthUserDto {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
}

export interface AuthApiErrorResponse {
  statusCode?: number;
  message?: string | readonly string[];
  error?: string;
  timestamp?: string;
  path?: string;
}
