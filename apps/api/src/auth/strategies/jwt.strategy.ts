import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser, JwtPayload } from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "atfm-dev-secret-change-me"),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      personId: payload.sub,
      username: payload.username,
      name: payload.name,
      roles: payload.roles,
      societies: payload.societies,
    };
  }
}
