import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'evconnect-dev-secret',
    });
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) return null;
    return { id: user.id, phone: user.phone, role: user.role, name: user.name };
  }
}
