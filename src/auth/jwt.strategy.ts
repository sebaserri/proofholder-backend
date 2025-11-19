import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { ACCESS_COOKIE } from "./auth.constants";
import { UserRole } from "@prisma/client";

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  vendorId?: string;
  firstName?: string | null;
  lastName?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "change-me",
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId ?? null,
      vendorId: payload.vendorId,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
    };
  }

  private static extractFromCookie(req: Request): string | null {
    return req?.cookies?.[ACCESS_COOKIE] ?? null;
  }
}
