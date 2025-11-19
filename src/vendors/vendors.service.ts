import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { COIStatus, Prisma, UserRole, VendorAuthStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorSearchItem,
  VendorStatsDto,
  VendorWithAuthorizationDto,
} from "./dto";

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // ==================== MÉTODOS BÁSICOS ====================

  /**
   * Crear un nuevo vendor
   */
  async create(data: CreateVendorDto, createdBy: string) {
    // Primero crear el usuario para el vendor
    const user = await this.prisma.user.create({
      data: {
        email: data.contactEmail,
        password: "", // Se debe hashear en producción o enviar link de setup
        role: UserRole.VENDOR,
        emailVerifiedAt: null, // Requiere verificación
      },
    });

    // Luego crear el vendor asociado al usuario
    return this.prisma.vendor.create({
      data: {
        userId: user.id,
        companyName: data.legalName,
        contactName: data.contactName || data.legalName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        serviceType: data.serviceType || [],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Obtener vendor por ID (método original mejorado)
   */
  async get(id: string) {
    return this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            lastLoginAt: true,
          },
        },
        authorizations: {
          include: {
            building: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        _count: {
          select: {
            cois: true,
            authorizations: true,
          },
        },
      },
    });
  }

  /**
   * Alias para mantener compatibilidad
   */
  async findOne(id: string) {
    return this.get(id);
  }

  /**
   * Actualizar teléfono (método original)
   */
  async setPhone(id: string, phone: string) {
    return this.prisma.vendor.update({
      where: { id },
      data: { contactPhone: phone },
    });
  }

  /**
   * Alias para el controller
   */
  async updatePhone(id: string, phone: string) {
    return this.setPhone(id, phone);
  }

  /**
   * Búsqueda de vendors (método original mejorado)
   */
  async search(q: string, buildingId?: string): Promise<VendorSearchItem[]> {
    const where: Prisma.VendorWhereInput = {
      OR: [
        { companyName: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
      ],
    };

    // Si se especifica building, filtrar por vendors autorizados
    if (buildingId) {
      where.authorizations = {
        some: {
          buildingId,
          status: VendorAuthStatus.APPROVED,
        },
      };
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        contactPhone: true,
      },
      take: 10,
    });

    return vendors.map((v) => ({
      id: v.id,
      legalName: v.companyName,
      contactPhone: v.contactPhone || undefined,
    }));
  }

  // ==================== MÉTODOS NUEVOS PARA 7 ROLES ====================

  /**
   * Actualizar información del vendor
   */
  async update(id: string, data: UpdateVendorDto) {
    return this.prisma.vendor.update({
      where: { id },
      data: {
        companyName: data.legalName || data.companyName,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        serviceType: data.serviceType,
      },
    });
  }

  /**
   * Buscar vendor por userId
   */
  async findByUserId(userId: string) {
    return this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        authorizations: {
          include: {
            building: true,
          },
        },
      },
    });
  }

  /**
   * Obtener vendors por edificio
   */
  async findByBuilding(
    buildingId: string
  ): Promise<VendorWithAuthorizationDto[]> {
    const authorizations =
      await this.prisma.vendorBuildingAuthorization.findMany({
        where: {
          buildingId,
          status: VendorAuthStatus.APPROVED,
        },
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
          building: true,
        },
      });

    const now = new Date();

    return authorizations.map((auth) => ({
      id: auth.vendor.id,
      companyName: auth.vendor.companyName,
      contactName: auth.vendor.contactName,
      contactPhone: auth.vendor.contactPhone ?? undefined,
      contactEmail: auth.vendor.contactEmail,
      authorizationStatus: auth.status,
      approvedAt: auth.approvedAt ?? undefined,
      hasValidCOI: auth.vendor.cois.some(
        (coi) =>
          coi.status === COIStatus.APPROVED &&
          coi.effectiveDate &&
          coi.expirationDate &&
          coi.effectiveDate <= now &&
          coi.expirationDate > now
      ),
      coiExpirationDate: auth.vendor.cois[0]?.expirationDate ?? undefined,
      buildings: auth.building ? [auth.building] : undefined,
    }));
  }

  /**
   * Obtener vendors por múltiples edificios
   */
  async findByBuildings(
    buildingIds: string[]
  ): Promise<VendorWithAuthorizationDto[]> {
    if (buildingIds.length === 0) return [];

    const authorizations =
      await this.prisma.vendorBuildingAuthorization.findMany({
        where: {
          buildingId: { in: buildingIds },
          status: VendorAuthStatus.APPROVED,
        },
        include: {
          vendor: {
            include: {
              cois: {
                where: {
                  buildingId: { in: buildingIds },
                },
                orderBy: { expirationDate: "desc" },
                take: 1,
              },
            },
          },
          building: true,
        },
        distinct: ["vendorId"], // Evitar duplicados si vendor está en múltiples edificios
      });

    const now = new Date();

    return authorizations.map((auth) => ({
      id: auth.vendor.id,
      companyName: auth.vendor.companyName,
      contactName: auth.vendor.contactName,
      contactPhone: auth.vendor.contactPhone ?? undefined,
      contactEmail: auth.vendor.contactEmail,
      authorizationStatus: auth.status,
      approvedAt: auth.approvedAt ?? undefined,
      hasValidCOI: auth.vendor.cois.some(
        (coi) =>
          coi.status === COIStatus.APPROVED &&
          coi.effectiveDate &&
          coi.expirationDate &&
          coi.effectiveDate <= now &&
          coi.expirationDate > now
      ),
      coiExpirationDate: auth.vendor.cois[0]?.expirationDate ?? undefined,
      buildings: auth.building ? [auth.building] : undefined,
    }));
  }

  /**
   * Aprobar vendor para un edificio
   */
  async approveForBuilding(
    vendorId: string,
    buildingId: string,
    approvedBy: string
  ) {
    // Verificar que el vendor existe
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor no encontrado");
    }

    // Crear o actualizar autorización
    return this.prisma.vendorBuildingAuthorization.upsert({
      where: {
        vendorId_buildingId: {
          vendorId,
          buildingId,
        },
      },
      update: {
        status: VendorAuthStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        notes: null,
      },
      create: {
        vendorId,
        buildingId,
        status: VendorAuthStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        building: true,
      },
    });
  }

  /**
   * Rechazar vendor para un edificio
   */
  async rejectForBuilding(
    vendorId: string,
    buildingId: string,
    rejectedBy: string,
    notes?: string
  ) {
    // Verificar que el vendor existe
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor no encontrado");
    }

    // Actualizar autorización
    return this.prisma.vendorBuildingAuthorization.upsert({
      where: {
        vendorId_buildingId: {
          vendorId,
          buildingId,
        },
      },
      update: {
        status: VendorAuthStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
        notes,
      },
      create: {
        vendorId,
        buildingId,
        status: VendorAuthStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        notes,
      },
      include: {
        vendor: true,
        building: true,
      },
    });
  }

  /**
   * Verificar si vendor está autorizado para un edificio
   */
  async isAuthorizedForBuilding(
    vendorId: string,
    buildingId: string
  ): Promise<boolean> {
    const auth = await this.prisma.vendorBuildingAuthorization.findUnique({
      where: {
        vendorId_buildingId: {
          vendorId,
          buildingId,
        },
      },
    });

    return auth?.status === VendorAuthStatus.APPROVED;
  }

  /**
   * Obtener autorizaciones del vendor
   */
  async getVendorAuthorizations(vendorId: string) {
    return this.prisma.vendorBuildingAuthorization.findMany({
      where: { vendorId },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        approver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        rejector: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Obtener autorizaciones del vendor filtradas por edificios
   */
  async getVendorAuthorizationsForBuildings(
    vendorId: string,
    buildingIds: string[]
  ) {
    return this.prisma.vendorBuildingAuthorization.findMany({
      where: {
        vendorId,
        buildingId: { in: buildingIds },
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  /**
   * Verificar si un usuario puede acceder a un vendor
   */
  async userCanAccessVendor(user: any, vendorId: string): Promise<boolean> {
    // Si es management, puede ver todos los vendors
    if (
      [
        UserRole.ACCOUNT_OWNER,
        UserRole.PORTFOLIO_MANAGER,
        UserRole.PROPERTY_MANAGER,
      ].includes(user.role)
    ) {
      // Pero verificamos que sea de su organización
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          authorizations: {
            include: {
              building: true,
            },
          },
        },
      });

      if (!vendor) return false;

      // Verificar que al menos una autorización es en un edificio de su organización
      for (const auth of vendor.authorizations) {
        if (auth.building.organizationId === user.organizationId) {
          return true;
        }
      }
    }

    // Building Owner puede ver vendors de sus edificios
    if (user.role === UserRole.BUILDING_OWNER) {
      const buildings = await this.prisma.building.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });

      const buildingIds = buildings.map((b) => b.id);

      const auth = await this.prisma.vendorBuildingAuthorization.findFirst({
        where: {
          vendorId,
          buildingId: { in: buildingIds },
          status: VendorAuthStatus.APPROVED,
        },
      });

      return !!auth;
    }

    return false;
  }

  /**
   * Obtener estadísticas del vendor
   */
  async getVendorStats(vendorId: string): Promise<VendorStatsDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor no encontrado");
    }

    const now = new Date();

    // Obtener todas las métricas
    const [
      totalAuthorizations,
      approvedAuthorizations,
      totalCOIs,
      activeCOIs,
      expiredCOIs,
      pendingCOIs,
      lastCOI,
      nextExpiring,
    ] = await Promise.all([
      // Total de autorizaciones
      this.prisma.vendorBuildingAuthorization.count({
        where: { vendorId },
      }),
      // Autorizaciones aprobadas
      this.prisma.vendorBuildingAuthorization.count({
        where: {
          vendorId,
          status: VendorAuthStatus.APPROVED,
        },
      }),
      // Total de COIs
      this.prisma.cOI.count({
        where: { vendorId },
      }),
      // COIs activos
      this.prisma.cOI.count({
        where: {
          vendorId,
          status: COIStatus.APPROVED,
          effectiveDate: { lte: now },
          expirationDate: { gt: now },
        },
      }),
      // COIs vencidos
      this.prisma.cOI.count({
        where: {
          vendorId,
          expirationDate: { lte: now },
        },
      }),
      // COIs pendientes
      this.prisma.cOI.count({
        where: {
          vendorId,
          status: COIStatus.PENDING,
        },
      }),
      // Último COI subido
      this.prisma.cOI.findFirst({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      // Próximo COI a vencer
      this.prisma.cOI.findFirst({
        where: {
          vendorId,
          status: COIStatus.APPROVED,
          expirationDate: { gt: now },
        },
        orderBy: { expirationDate: "asc" },
        select: { expirationDate: true },
      }),
    ]);

    // Calcular compliance rate
    const complianceRate =
      approvedAuthorizations > 0
        ? (activeCOIs / approvedAuthorizations) * 100
        : 0;

    return {
      vendorId,
      vendorName: vendor.companyName,
      totalBuildings: totalAuthorizations,
      approvedBuildings: approvedAuthorizations,
      totalCOIs,
      activeCOIs,
      expiredCOIs,
      pendingCOIs,
      complianceRate: Math.round(complianceRate),
      lastCOIUploadDate: lastCOI?.createdAt,
      nextCOIExpirationDate: nextExpiring?.expirationDate ?? new Date(),
      serviceTypes: vendor.serviceType,
    };
  }

  /**
   * Eliminar vendor (soft delete recomendado)
   */
  async delete(id: string) {
    // Verificar que no tiene COIs activos
    const activeCOIs = await this.prisma.cOI.count({
      where: {
        vendorId: id,
        status: COIStatus.APPROVED,
        expirationDate: { gt: new Date() },
      },
    });

    if (activeCOIs > 0) {
      throw new BadRequestException(
        "No se puede eliminar un vendor con COIs activos"
      );
    }

    // Eliminar autorizaciones primero
    await this.prisma.vendorBuildingAuthorization.deleteMany({
      where: { vendorId: id },
    });

    // Eliminar vendor
    const vendor = await this.prisma.vendor.delete({
      where: { id },
    });

    // Opcionalmente, desactivar el usuario asociado
    if (vendor.userId) {
      await this.prisma.user.update({
        where: { id: vendor.userId },
        data: {
          emailVerifiedAt: null, // Desactivar
        },
      });
    }

    return vendor;
  }
}
