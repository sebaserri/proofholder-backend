import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { COIStatus, Prisma, UserRole, VendorAuthStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  BuildingStatsDto,
  CreateBuildingDto,
  CreateRequirementTemplateDto,
  UpdateBuildingDto,
} from "./dto";

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  // ==================== CRUD BÁSICO ====================

  async list() {
    return this.prisma.building.findMany({
      include: {
        organization: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            vendorAuthorizations: true,
            tenants: true,
            cois: true,
            guardAssignments: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async create(
    data: CreateBuildingDto & { organizationId: string; createdBy: string }
  ) {
    return this.prisma.building.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        organizationId: data.organizationId,
        createdBy: data.createdBy,
      },
      include: {
        organization: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.building.findUnique({
      where: { id },
      include: {
        organization: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        requirements: {
          where: { active: true },
          take: 1,
        },
      },
    });
  }

  async update(id: string, data: UpdateBuildingDto) {
    return this.prisma.building.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    // Verificar que no hay datos críticos antes de eliminar
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cois: true,
            tenants: true,
            vendorAuthorizations: true,
          },
        },
      },
    });

    if (!building) {
      throw new NotFoundException("Edificio no encontrado");
    }

    if (building._count.cois > 0) {
      throw new BadRequestException(
        "No se puede eliminar un edificio con COIs"
      );
    }

    if (building._count.tenants > 0) {
      throw new BadRequestException(
        "No se puede eliminar un edificio con inquilinos"
      );
    }

    return this.prisma.building.delete({
      where: { id },
    });
  }

  // ==================== GESTIÓN DE PROPERTY MANAGERS ====================

  async assignPropertyManager(
    buildingId: string,
    propertyManagerId: string,
    assignedBy: string
  ) {
    // Verificar que el usuario es un Property Manager
    const pm = await this.prisma.user.findUnique({
      where: { id: propertyManagerId },
    });

    if (!pm || pm.role !== UserRole.PROPERTY_MANAGER) {
      throw new BadRequestException(
        "Usuario inválido o no es Property Manager"
      );
    }

    // Verificar que el edificio existe
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException("Edificio no encontrado");
    }

    // Verificar que pertenecen a la misma organización
    if (pm.organizationId !== building.organizationId) {
      throw new BadRequestException(
        "El Property Manager no pertenece a la organización del edificio"
      );
    }

    // Crear o actualizar el acceso
    return this.prisma.userBuildingAccess.upsert({
      where: {
        userId_buildingId: {
          userId: propertyManagerId,
          buildingId: buildingId,
        },
      },
      update: {
        assignedBy: assignedBy,
        assignedAt: new Date(),
      },
      create: {
        userId: propertyManagerId,
        buildingId: buildingId,
        assignedBy: assignedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removePropertyManager(buildingId: string, propertyManagerId: string) {
    const access = await this.prisma.userBuildingAccess.findUnique({
      where: {
        userId_buildingId: {
          userId: propertyManagerId,
          buildingId: buildingId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException(
        "Property Manager no está asignado a este edificio"
      );
    }

    return this.prisma.userBuildingAccess.delete({
      where: {
        userId_buildingId: {
          userId: propertyManagerId,
          buildingId: buildingId,
        },
      },
    });
  }

  async getPropertyManagers(buildingId: string) {
    const accesses = await this.prisma.userBuildingAccess.findMany({
      where: {
        buildingId: buildingId,
        user: {
          role: UserRole.PROPERTY_MANAGER,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assigner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return accesses.map((access) => ({
      id: access.user.id,
      email: access.user.email,
      firstName: access.user.firstName,
      lastName: access.user.lastName,
      assignedAt: access.assignedAt,
      assignedBy: access.assigner.email,
    }));
  }

  // ==================== GESTIÓN DE BUILDING OWNER ====================

  async setBuildingOwner(buildingId: string, ownerId: string) {
    // Verificar que el usuario es un Building Owner
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner || owner.role !== UserRole.BUILDING_OWNER) {
      throw new BadRequestException("Usuario inválido o no es Building Owner");
    }

    return this.prisma.building.update({
      where: { id: buildingId },
      data: { ownerId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // ==================== REQUISITOS ====================

  async getActiveRequirements(buildingId: string) {
    return this.prisma.requirementTemplate.findFirst({
      where: {
        buildingId,
        active: true,
      },
    });
  }

  async createRequirements(
    buildingId: string,
    data: CreateRequirementTemplateDto
  ) {
    // Desactivar requisitos anteriores
    await this.prisma.requirementTemplate.updateMany({
      where: {
        buildingId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // Crear nuevos requisitos
    return this.prisma.requirementTemplate.create({
      data: {
        ...data,
        buildingId,
        active: true,
      },
    });
  }

  // ==================== ESTADÍSTICAS ====================

  async getBuildingStats(buildingId: string): Promise<BuildingStatsDto> {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException("Edificio no encontrado");
    }

    // Obtener conteos
    const [vendorAuths, tenants, guards, cois] = await Promise.all([
      // Vendors
      this.prisma.vendorBuildingAuthorization.groupBy({
        by: ["status"],
        where: { buildingId },
        _count: true,
      }),
      // Tenants
      this.prisma.tenant.count({
        where: { buildingId },
      }),
      // Guards
      this.prisma.guardBuildingAssignment.count({
        where: { buildingId },
      }),
      // COIs
      this.prisma.cOI.groupBy({
        by: ["status"],
        where: { buildingId },
        _count: true,
      }),
    ]);

    // COIs vigentes y vencidos
    const now = new Date();
    const validCOIs = await this.prisma.cOI.count({
      where: {
        buildingId,
        status: COIStatus.APPROVED,
        effectiveDate: { lte: now },
        expirationDate: { gt: now },
      },
    });

    const expiredCOIs = await this.prisma.cOI.count({
      where: {
        buildingId,
        expirationDate: { lte: now },
      },
    });

    // Vendors con COI vigente
    const vendorsWithValidCOI = await this.prisma.vendor.count({
      where: {
        authorizations: {
          some: {
            buildingId,
            status: VendorAuthStatus.APPROVED,
          },
        },
        cois: {
          some: {
            buildingId,
            status: COIStatus.APPROVED,
            effectiveDate: { lte: now },
            expirationDate: { gt: now },
          },
        },
      },
    });

    // Últimas fechas relevantes
    const lastApproval = await this.prisma.cOI.findFirst({
      where: {
        buildingId,
        status: COIStatus.APPROVED,
      },
      orderBy: { reviewedAt: "desc" },
      select: { reviewedAt: true },
    });

    const nextExpiration = await this.prisma.cOI.findFirst({
      where: {
        buildingId,
        status: COIStatus.APPROVED,
        expirationDate: { gt: now },
      },
      orderBy: { expirationDate: "asc" },
      select: { expirationDate: true },
    });

    // Calcular totales
    const totalVendors = vendorAuths.reduce(
      (acc, curr) => acc + curr._count,
      0
    );
    const approvedVendors =
      vendorAuths.find((v) => v.status === VendorAuthStatus.APPROVED)?._count ||
      0;
    const totalCOIs = cois.reduce((acc, curr) => acc + curr._count, 0);
    const pendingCOIs =
      cois.find((c) => c.status === COIStatus.PENDING)?._count || 0;
    const approvedCOIs =
      cois.find((c) => c.status === COIStatus.APPROVED)?._count || 0;
    const rejectedCOIs =
      cois.find((c) => c.status === COIStatus.REJECTED)?._count || 0;

    return {
      buildingId,
      buildingName: building.name,
      totalVendors: approvedVendors,
      vendorsWithValidCOI,
      vendorsWithExpiredCOI: approvedVendors - vendorsWithValidCOI,
      vendorsWithoutCOI: approvedVendors - vendorsWithValidCOI,
      totalTenants: tenants,
      tenantsWithValidCOI: 0, // TODO: Implementar cuando se agregue lógica de COI para tenants
      totalGuards: guards,
      totalCOIs,
      pendingCOIs,
      approvedCOIs,
      rejectedCOIs,
      expiredCOIs,
      lastCOIApprovalDate: lastApproval?.reviewedAt ?? new Date(),
      nextCOIExpirationDate: nextExpiration?.expirationDate ?? new Date(),
    };
  }

  // ==================== VENDORS DEL EDIFICIO ====================

  async getBuildingVendors(buildingId: string, status?: string) {
    const where: Prisma.VendorBuildingAuthorizationWhereInput = {
      buildingId,
    };

    if (status) {
      where.status = status as VendorAuthStatus;
    }

    const authorizations =
      await this.prisma.vendorBuildingAuthorization.findMany({
        where,
        include: {
          vendor: {
            include: {
              cois: {
                where: { buildingId },
                orderBy: { expirationDate: "desc" },
                take: 1,
              },
            },
          },
        },
      });

    const now = new Date();

    return authorizations.map((auth) => ({
      id: auth.vendor.id,
      companyName: auth.vendor.companyName,
      contactName: auth.vendor.contactName,
      contactPhone: auth.vendor.contactPhone,
      contactEmail: auth.vendor.contactEmail,
      authorizationStatus: auth.status,
      approvedAt: auth.approvedAt,
      hasValidCOI: auth.vendor.cois.some(
        (coi) =>
          coi.status === COIStatus.APPROVED &&
          coi.effectiveDate &&
          coi.expirationDate &&
          coi.effectiveDate <= now &&
          coi.expirationDate > now
      ),
      coiExpirationDate: auth.vendor.cois[0]?.expirationDate,
    }));
  }

  // ==================== INQUILINOS DEL EDIFICIO ====================

  async getBuildingTenants(buildingId: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { buildingId },
      include: {
        cois: {
          orderBy: { expirationDate: "desc" },
          take: 1,
        },
      },
    });

    const now = new Date();

    return tenants.map((tenant) => ({
      id: tenant.id,
      businessName: tenant.businessName,
      contactName: tenant.contactName,
      unitNumber: tenant.unitNumber,
      contactPhone: tenant.contactPhone,
      contactEmail: tenant.contactEmail,
      leaseStartDate: tenant.leaseStartDate,
      leaseEndDate: tenant.leaseEndDate,
      hasValidCOI: tenant.cois.some(
        (coi) =>
          coi.status === COIStatus.APPROVED &&
          coi.effectiveDate &&
          coi.expirationDate &&
          coi.effectiveDate <= now &&
          coi.expirationDate > now
      ),
      coiExpirationDate: tenant.cois[0]?.expirationDate,
    }));
  }

  // ==================== GUARDIAS DEL EDIFICIO ====================

  async getBuildingGuards(buildingId: string) {
    const assignments = await this.prisma.guardBuildingAssignment.findMany({
      where: { buildingId },
      include: {
        guard: true,
        assigner: {
          select: {
            email: true,
          },
        },
      },
    });

    return assignments.map((assignment) => ({
      id: assignment.guard.id,
      firstName: assignment.guard.firstName,
      lastName: assignment.guard.lastName,
      phone: assignment.guard.phone,
      employeeId: assignment.guard.employeeId,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assigner.email,
    }));
  }

  // ==================== COIs DEL EDIFICIO ====================

  async getBuildingCOIs(buildingId: string, status?: string) {
    const where: Prisma.COIWhereInput = {
      buildingId,
    };

    if (status) {
      where.status = status as COIStatus;
    }

    return this.prisma.cOI.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getBuildingCOIsSummary(buildingId: string, status?: string) {
    const cois = await this.getBuildingCOIs(buildingId, status);
    const now = new Date();

    return cois.map((coi) => ({
      id: coi.id,
      vendorId: coi.vendorId,
      vendorName: coi.vendor?.companyName,
      tenantId: coi.tenantId,
      tenantName: coi.tenant?.businessName,
      status: coi.status,
      effectiveDate: coi.effectiveDate,
      expirationDate: coi.expirationDate,
      accessStatus:
        coi.status === COIStatus.APPROVED &&
        coi.effectiveDate &&
        coi.expirationDate &&
        coi.effectiveDate <= now &&
        coi.expirationDate > now
          ? "APPROVED"
          : "REJECTED",
    }));
  }
}
