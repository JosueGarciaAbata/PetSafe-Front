export class UserResponseDto {
  id!: number;
  email!: string;
  roles!: string[];
  firstName!: string;
  lastName!: string;
  isVet!: boolean;
  requiresPasswordChange!: boolean;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: UserResponseDto;
}
