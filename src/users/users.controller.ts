import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailService } from "../notifications/email.service";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  InviteUserDto,
  UserInvitationDto,
  UserListItemDto,
} from "./dto";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly email: EmailService
  ) {}

  @Get()
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary: "List users in the organization (management only)",
  })
  @ApiResponse({ status: 200, type: [UserListItemDto] })
  async list(@CurrentUser() user: User): Promise<UserListItemDto[]> {
    const [users, invitations] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.userInvitation.findMany({
        where: {
          organizationId: user.organizationId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          acceptedAt: null,
        },
      }),
    ]);

    const invitedEmails = new Set(
      invitations.map((i) => i.email.toLowerCase())
    );

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      lastLoginAt: (u as any).lastLoginAt ?? null,
      invited: invitedEmails.has(u.email.toLowerCase()),
    }));
  }

  @Get("invitations")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary: "List pending user invitations in the organization",
  })
  @ApiResponse({ status: 200, type: [UserInvitationDto] })
  async listInvitations(
    @CurrentUser() user: User
  ): Promise<UserInvitationDto[]> {
    const [users, invitations] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        select: { email: true },
      }),
      this.prisma.userInvitation.findMany({
        where: {
          organizationId: user.organizationId,
          revokedAt: null,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { inviter: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const userEmails = new Set(
      users.map((u) => u.email.toLowerCase())
    );

    // Only invitations that don't yet have a user associated
    const pending = invitations.filter(
      (inv) => !userEmails.has(inv.email.toLowerCase())
    );

    return pending.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      invitedAt: inv.createdAt,
      invitedByName:
        inv.inviter?.firstName || inv.inviter?.lastName
          ? `${inv.inviter.firstName ?? ""} ${
              inv.inviter.lastName ?? ""
            }`.trim()
          : inv.inviter?.email ?? null,
    }));
  }

  @Post("invite")
  @ApiOperation({
    summary:
      "Invite a user with a specific role (Portfolio Manager, Property Manager, Building Owner, Guard, Tenant, Vendor)",
  })
  @ApiResponse({ status: 200, description: "Invitation processed" })
  async invite(@CurrentUser() user: User, @Body() dto: InviteUserDto) {
    const { role } = dto;

    // Check if caller has permission to invite this role
    const allowed = this.canInviteRole(user, role);
    if (!allowed) {
      throw new ForbiddenException("You do not have permission to invite this role");
    }

    // Avoid inviting already-registered emails
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException("Email already registered");
    }

    const base = process.env.PUBLIC_APP_URL || "http://localhost:4000";

    const params = new URLSearchParams({
      email: dto.email,
      role: role,
      invited: "1",
    });
    if (dto.firstName) params.append("firstName", dto.firstName);
    if (dto.lastName) params.append("lastName", dto.lastName);

    const link = `${base}/register?${params.toString()}`;

    // Track invitation in a dedicated table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invitationToken = `${dto.email.toLowerCase()}::${role}::${Date.now()}`;

    await this.prisma.userInvitation.create({
      data: {
        email: dto.email.toLowerCase(),
        role,
        organizationId: user.organizationId,
        invitedById: user.id,
        token: invitationToken,
        expiresAt,
      },
    });

    const subject = this.buildSubject(role);
    const html = this.buildHtml(dto, link, role);

    await this.email.send(dto.email, subject, html);

    return { ok: true };
  }

  @Post("invitations/:id/resend")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary: "Resend an existing user invitation email",
  })
  async resendInvitation(
    @CurrentUser() user: User,
    @Body() body: { email?: string },
    @Param("id") id: string
  ) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id },
      include: { inviter: true },
    });

    if (!invitation) {
      throw new BadRequestException("Invitation not found");
    }
    if (
      invitation.organizationId &&
      invitation.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException("You cannot manage this invitation");
    }
    if (invitation.revokedAt || invitation.acceptedAt) {
      throw new BadRequestException("Invitation is no longer active");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("Invitation has expired");
    }

    const inviteeEmail = body.email || invitation.email;
    const base = process.env.PUBLIC_APP_URL || "http://localhost:4000";
    const params = new URLSearchParams({
      email: inviteeEmail,
      role: invitation.role,
      invited: "1",
    });
    const link = `${base}/register?${params.toString()}`;

    const subject = this.buildSubject(invitation.role);
    const html = this.buildHtml(
      {
        email: inviteeEmail,
        role: invitation.role,
      } as InviteUserDto,
      link,
      invitation.role
    );

    await this.email.send(inviteeEmail, subject, html);

    return { ok: true };
  }

  @Post("invitations/:id/revoke")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary: "Revoke a pending user invitation",
  })
  async revokeInvitation(
    @CurrentUser() user: User,
    @Param("id") id: string
  ) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new BadRequestException("Invitation not found");
    }
    if (
      invitation.organizationId &&
      invitation.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException("You cannot manage this invitation");
    }
    if (invitation.revokedAt || invitation.acceptedAt) {
      return { ok: true };
    }

    await this.prisma.userInvitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  private canInviteRole(user: User, role: UserRole): boolean {
    switch (role) {
      case UserRole.PORTFOLIO_MANAGER:
        return this.permissions.canInvitePortfolioManager(user);
      case UserRole.PROPERTY_MANAGER:
        return this.permissions.canInvitePropertyManager(user);
      case UserRole.BUILDING_OWNER:
        return this.permissions.canInviteBuildingOwner(user);
      case UserRole.GUARD:
        return this.permissions.canInviteGuard(user);
      case UserRole.TENANT:
        return this.permissions.canInviteTenant(user);
      case UserRole.VENDOR:
        return this.permissions.canInviteVendor(user);
      default:
        return false;
    }
  }

  private buildSubject(role: UserRole): string {
    switch (role) {
      case UserRole.PORTFOLIO_MANAGER:
        return "You’ve been invited as Portfolio Manager";
      case UserRole.PROPERTY_MANAGER:
        return "You’ve been invited as Property Manager";
      case UserRole.BUILDING_OWNER:
        return "You’ve been invited as Building Owner";
      case UserRole.GUARD:
        return "You’ve been invited as Guard";
      case UserRole.TENANT:
        return "You’ve been invited as Tenant";
      case UserRole.VENDOR:
        return "You’ve been invited as Vendor";
      default:
        return "You’ve been invited to ProofHolder";
    }
  }

  private buildHtml(dto: InviteUserDto, link: string, role: UserRole): string {
    const friendlyRole = role.replace(/_/g, " ").toLowerCase();
    const name =
      dto.firstName || dto.lastName
        ? `${dto.firstName ?? ""} ${dto.lastName ?? ""}`.trim()
        : dto.email;

    return `
      <p>Hi ${name},</p>
      <p>You’ve been invited to join <strong>ProofHolder</strong> as a <strong>${friendlyRole}</strong>.</p>
      <p>To accept the invitation and create your account, please use the following link:</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you didn’t expect this invitation, you can safely ignore this email.</p>
    `;
  }
}
