import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthTokenType, UserRole, User, Vendor } from "@prisma/client";
import { EmailService } from "../notifications/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { ACCESS_TTL_MIN, REFRESH_TTL_DAYS } from "./auth.constants";
import { randomToken, hashToken, verifyTokenHash } from "./crypto.util";
import { LoginDto, RegisterDto } from "./dto";
import { hashPassword, verifyPassword } from "./password.util";
import { randomBytes } from "crypto";

function makeToken(n = 32) {
  return randomBytes(n).toString("hex");
}

function addHours(h: number) {
  return new Date(Date.now() + h * 3600 * 1000);
}

type UserWithVendor = User & { vendor?: Vendor | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService
  ) {}

  private async signAccess(user: UserWithVendor): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId ?? null,
      vendorId: user.vendor?.id ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: `${ACCESS_TTL_MIN}m`,
      secret: process.env.JWT_SECRET || "change-me",
    });
  }

  private async issueRefresh(userId: string, ua?: string, ip?: string) {
    const token = randomToken(64);
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DAYS * 24 * 3600 * 1000
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  private async rotateRefresh(
    oldToken: string,
    userId: string,
    ua?: string,
    ip?: string
  ) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let matched: (typeof tokens)[number] | null = null;
    for (const t of tokens) {
      const ok = await verifyTokenHash(t.tokenHash, oldToken);
      if (ok) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      throw new ForbiddenException("Invalid refresh");
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    return this.issueRefresh(userId, ua, ip);
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException("Email already registered");
    }

    const hash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        role: dto.role,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        phone: dto.phone ?? null,
      },
    });

    // If this registration comes from an invitation, mark it as accepted
    if (dto.invited) {
      await this.prisma.userInvitation
        .updateMany({
          where: {
            email: dto.email.toLowerCase(),
            role: dto.role,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        })
        .catch(() => {});
    }

    await this.issueEmailVerification(
      user.id,
      user.email,
      user.firstName ?? undefined
    ).catch(() => {});

    const full: UserWithVendor = {
      ...user,
      vendor: null,
    };

    const at = await this.signAccess(full);
    const { token: rt } = await this.issueRefresh(user.id);

    return { at, rt, user };
  }

  async login(dto: LoginDto, ua?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true },
    });
    if (!user) {
      throw new BadRequestException("Invalid credentials");
    }

    const ok = await verifyPassword(user.password, dto.password);
    if (!ok) {
      throw new BadRequestException("Invalid credentials");
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException("Email not verified");
    }

    const at = await this.signAccess(user);
    const { token: rt } = await this.issueRefresh(user.id, ua, ip);

    return { at, rt, user };
  }

  async logout(userId: string, refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const t of tokens) {
      const ok = await verifyTokenHash(t.tokenHash, refreshToken);
      if (ok) {
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    return { ok: true };
  }

  async issueEmailVerification(userId: string, email: string, name?: string) {
    const t = await this.prisma.authToken.create({
      data: {
        userId,
        type: AuthTokenType.EMAIL_VERIFY,
        token: makeToken(),
        expiresAt: addHours(48),
      },
    });

    const base = process.env.PUBLIC_APP_URL || "http://localhost:4000";
    const link = `${base}/(auth)/verify-email?token=${t.token}`;

    await this.email.send(
      email,
      "Verifica tu email",
      `
      <p>Hola ${name ?? ""},</p>
      <p>Verificá tu email haciendo clic aquí:</p>
      <p><a href="${link}">${link}</a></p>
    `
    );

    return { ok: true };
  }

  async verifyEmail(tokenStr: string) {
    const t = await this.prisma.authToken.findUnique({
      where: { token: tokenStr },
    });

    if (
      !t ||
      t.type !== AuthTokenType.EMAIL_VERIFY ||
      t.usedAt ||
      t.expiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: t.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.authToken.update({
        where: { id: t.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      await this.issueEmailVerification(
        user.id,
        user.email,
        user.firstName ?? undefined
      );
    }
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const t = await this.prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.PWD_RESET,
          token: makeToken(),
          expiresAt: addHours(2),
        },
      });

      const base = process.env.PUBLIC_APP_URL || "http://localhost:4000";
      const link = `${base}/(auth)/reset-password?token=${t.token}`;

      await this.email.send(
        email,
        "Restablecer contraseña",
        `
        <p>Para restablecer tu contraseña, usa este enlace:</p>
        <p><a href="${link}">${link}</a> (válido por 2 horas)</p>
      `
      );
    }

    return { ok: true };
  }

  async resetPassword(tokenStr: string, password: string) {
    const t = await this.prisma.authToken.findUnique({
      where: { token: tokenStr },
    });

    if (
      !t ||
      t.type !== AuthTokenType.PWD_RESET ||
      t.usedAt ||
      t.expiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid token");
    }

    const hash = await hashPassword(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: t.userId },
        data: { password: hash },
      }),
      this.prisma.authToken.update({
        where: { id: t.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  async refresh(
    userId: string,
    refreshToken: string,
    ua?: string,
    ip?: string
  ) {
    const { token: newRt } = await this.rotateRefresh(
      refreshToken,
      userId,
      ua,
      ip
    );

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });

    if (!user) {
      throw new ForbiddenException("User not found");
    }

    const at = await this.signAccess(user);
    return { at, rt: newRt, user };
  }
}
