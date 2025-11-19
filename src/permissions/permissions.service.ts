import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  User,
  UserRole,
  Building,
  Vendor,
  Tenant,
  Guard,
} from "@prisma/client";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== BILLING & ADMIN ====================

  canViewBilling(user: User): boolean {
    return user.role === UserRole.ACCOUNT_OWNER;
  }

  canManageSubscription(user: User): boolean {
    return user.role === UserRole.ACCOUNT_OWNER;
  }

  // ==================== TEAM MANAGEMENT ====================

  canInviteAccountOwner(): boolean {
    // Nobody can invite Account Owners - they must be set up during org creation
    return false;
  }

  canInvitePortfolioManager(user: User): boolean {
    return user.role === UserRole.ACCOUNT_OWNER;
  }

  canInvitePropertyManager(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER
    );
  }

  canInviteBuildingOwner(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canInviteTenant(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canInviteVendor(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canInviteGuard(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  // ==================== BUILDINGS ====================

  canCreateBuildings(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER
    );
  }

  canEditBuilding(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canDeleteBuilding(user: User): boolean {
    return user.role === UserRole.ACCOUNT_OWNER;
  }

  canAssignPropertyManager(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER
    );
  }

  async canViewBuilding(user: User, buildingId: string): Promise<boolean> {
    switch (user.role) {
      case UserRole.ACCOUNT_OWNER:
        // Account Owner can see ALL buildings in their organization
        const building = await this.prisma.building.findUnique({
          where: { id: buildingId },
        });
        return building?.organizationId === user.organizationId;

      case UserRole.PORTFOLIO_MANAGER:
      case UserRole.PROPERTY_MANAGER:
        // Only buildings they have been assigned to
        const access = await this.prisma.userBuildingAccess.findUnique({
          where: {
            userId_buildingId: {
              userId: user.id,
              buildingId: buildingId,
            },
          },
        });
        return !!access;

      case UserRole.BUILDING_OWNER:
        // Only buildings they own
        const ownedBuilding = await this.prisma.building.findUnique({
          where: { id: buildingId },
        });
        return ownedBuilding?.ownerId === user.id;

      case UserRole.TENANT:
        // Only their building
        const tenant = await this.prisma.tenant.findUnique({
          where: { userId: user.id },
        });
        return tenant?.buildingId === buildingId;

      case UserRole.VENDOR:
        // Buildings where they are authorized
        const vendorAuth =
          await this.prisma.vendorBuildingAuthorization.findFirst({
            where: {
              vendor: { userId: user.id },
              buildingId: buildingId,
              status: "APPROVED",
            },
          });
        return !!vendorAuth;

      case UserRole.GUARD:
        // Buildings they are assigned to
        const guardAssignment =
          await this.prisma.guardBuildingAssignment.findFirst({
            where: {
              guard: { userId: user.id },
              buildingId: buildingId,
            },
          });
        return !!guardAssignment;

      default:
        return false;
    }
  }

  async getUserBuildings(user: User): Promise<Building[]> {
    switch (user.role) {
      case UserRole.ACCOUNT_OWNER:
        // All buildings in organization
        return this.prisma.building.findMany({
          where: { organizationId: user.organizationId },
        });

      case UserRole.PORTFOLIO_MANAGER:
      case UserRole.PROPERTY_MANAGER:
        // Buildings they have access to
        const accesses = await this.prisma.userBuildingAccess.findMany({
          where: { userId: user.id },
          include: { building: true },
        });
        return accesses.map((a) => a.building);

      case UserRole.BUILDING_OWNER:
        // Buildings they own
        return this.prisma.building.findMany({
          where: { ownerId: user.id },
        });

      case UserRole.TENANT:
        // Their building only
        const tenant = await this.prisma.tenant.findUnique({
          where: { userId: user.id },
          include: { building: true },
        });
        return tenant ? [tenant.building] : [];

      case UserRole.VENDOR:
        // Buildings where they are authorized
        const vendorAuths =
          await this.prisma.vendorBuildingAuthorization.findMany({
            where: {
              vendor: { userId: user.id },
              status: "APPROVED",
            },
            include: { building: true },
          });
        return vendorAuths.map((a) => a.building);

      case UserRole.GUARD:
        // Buildings they are assigned to
        const guardAssignments =
          await this.prisma.guardBuildingAssignment.findMany({
            where: { guard: { userId: user.id } },
            include: { building: true },
          });
        return guardAssignments.map((a) => a.building);

      default:
        return [];
    }
  }

  // ==================== VENDORS ====================

  canApproveVendors(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canViewAllVendors(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER ||
      user.role === UserRole.BUILDING_OWNER
    );
  }

  canConfigureRequirements(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  async canManageVendorInBuilding(
    user: User,
    buildingId: string
  ): Promise<boolean> {
    // First check if they can approve vendors at all
    if (!this.canApproveVendors(user)) {
      return false;
    }

    // Then check if they have access to this specific building
    return this.canViewBuilding(user, buildingId);
  }

  // ==================== COIs ====================

  canManageCOIs(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canUploadOwnCOI(user: User): boolean {
    return user.role === UserRole.VENDOR || user.role === UserRole.TENANT;
  }

  canViewCOI(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER ||
      user.role === UserRole.BUILDING_OWNER ||
      user.role === UserRole.VENDOR || // Only their own
      user.role === UserRole.TENANT || // Only their own
      user.role === UserRole.GUARD
    ); // Status only
  }

  async canAccessCOI(user: User, coiId: string): Promise<boolean> {
    const coi = await this.prisma.cOI.findUnique({
      where: { id: coiId },
      include: { vendor: true, tenant: true },
    });

    if (!coi) return false;

    // Check building access first for most roles
    const hasBuildingAccess = await this.canViewBuilding(user, coi.buildingId);

    switch (user.role) {
      case UserRole.ACCOUNT_OWNER:
      case UserRole.PORTFOLIO_MANAGER:
      case UserRole.PROPERTY_MANAGER:
      case UserRole.BUILDING_OWNER:
        return hasBuildingAccess;

      case UserRole.VENDOR:
        // Only their own COIs
        return coi.vendor?.userId === user.id;

      case UserRole.TENANT:
        // Only their own COIs
        return coi.tenant?.userId === user.id;

      case UserRole.GUARD:
        // Can view status only if they have building access
        return hasBuildingAccess;

      default:
        return false;
    }
  }

  // ==================== REPORTS ====================

  canViewReports(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER ||
      user.role === UserRole.BUILDING_OWNER
    );
  }

  canExportData(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER ||
      user.role === UserRole.BUILDING_OWNER
    );
  }

  // ==================== GUARDS ====================

  canCreateGuards(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  canScanVendorQR(user: User): boolean {
    return user.role === UserRole.GUARD;
  }

  // ==================== ACCESS CONTROL ====================

  async canCheckAccess(user: User, buildingId: string): Promise<boolean> {
    if (user.role === UserRole.GUARD) {
      // Guard must be assigned to the building
      const assignment = await this.prisma.guardBuildingAssignment.findFirst({
        where: {
          guard: { userId: user.id },
          buildingId: buildingId,
        },
      });
      return !!assignment;
    }

    // Admin roles can check access if they have building access
    if (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    ) {
      return this.canViewBuilding(user, buildingId);
    }

    return false;
  }

  // ==================== AUDIT ====================

  canViewAuditLogs(user: User): boolean {
    return (
      user.role === UserRole.ACCOUNT_OWNER ||
      user.role === UserRole.PORTFOLIO_MANAGER ||
      user.role === UserRole.PROPERTY_MANAGER
    );
  }

  // ==================== HELPER METHODS ====================

  /**
   * Checks if a user has a specific role
   */
  hasRole(user: User, roles: UserRole | UserRole[]): boolean {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.indexOf(user.role) !== -1;
  }

  /**
   * Gets the scope level of a user (for hierarchical permissions)
   */
  getUserScopeLevel(user: User): number {
    const scopeLevels = {
      [UserRole.ACCOUNT_OWNER]: 100,
      [UserRole.PORTFOLIO_MANAGER]: 80,
      [UserRole.PROPERTY_MANAGER]: 60,
      [UserRole.BUILDING_OWNER]: 40,
      [UserRole.TENANT]: 20,
      [UserRole.VENDOR]: 20,
      [UserRole.GUARD]: 10,
    };

    return scopeLevels[user.role] || 0;
  }

  /**
   * Checks if user1 can manage user2 based on hierarchy
   */
  canManageUser(manager: User, target: User): boolean {
    // Account Owner can manage everyone in their org
    if (
      manager.role === UserRole.ACCOUNT_OWNER &&
      manager.organizationId === target.organizationId
    ) {
      return true;
    }

    // Portfolio Manager can manage Property Managers and below
    if (
      manager.role === UserRole.PORTFOLIO_MANAGER &&
      (target.role === UserRole.PROPERTY_MANAGER ||
        target.role === UserRole.GUARD) &&
      manager.organizationId === target.organizationId
    ) {
      return true;
    }

    // Property Manager can only manage Guards
    if (
      manager.role === UserRole.PROPERTY_MANAGER &&
      target.role === UserRole.GUARD &&
      manager.organizationId === target.organizationId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Validates that a user belongs to the correct organization
   */
  async validateOrganizationAccess(
    user: User,
    entityId: string,
    entityType: "building" | "vendor" | "tenant"
  ): Promise<boolean> {
    switch (entityType) {
      case "building":
        const building = await this.prisma.building.findUnique({
          where: { id: entityId },
        });
        return building?.organizationId === user.organizationId;

      case "vendor":
        // Vendors are cross-organization, so always true
        return true;

      case "tenant":
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: entityId },
          include: { building: true },
        });
        return tenant?.building.organizationId === user.organizationId;

      default:
        return false;
    }
  }

  /**
   * Throws a ForbiddenException with a specific message
   */
  throwForbidden(action: string): never {
    throw new ForbiddenException(`You don't have permission to ${action}`);
  }

  /**
   * Ensures a user has permission, throws if not
   */
  async ensurePermission(
    condition: boolean | Promise<boolean>,
    action: string
  ): Promise<void> {
    const hasPermission = await Promise.resolve(condition);
    if (!hasPermission) {
      this.throwForbidden(action);
    }
  }
}
