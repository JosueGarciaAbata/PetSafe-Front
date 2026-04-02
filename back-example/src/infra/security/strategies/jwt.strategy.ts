import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  correo: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'fallback_secret'),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, correo: payload.correo, roles: payload.roles };
  }
}
