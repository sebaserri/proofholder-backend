import { Injectable } from "@nestjs/common";
import { COIStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto, UpdateTenantDto } from "./dto";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto, createdBy: string) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.contactEmail,
        password: "",
        role: UserRole.TENANT,
        emailVerifiedAt: null,
      },
    });

    return this.prisma.tenant.create({
      data: {
        userId: user.id,
        businessName: dto.businessName,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        buildingId: dto.buildingId,
        unitNumber: dto.unitNumber,
        leaseStartDate: dto.leaseStartDate
          ? new Date(dto.leaseStartDate)
          : null,
        leaseEndDate: dto.leaseEndDate ? new Date(dto.leaseEndDate) : null,
        createdBy,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        cois: true,
      },
    });
  }

  async findByBuilding(buildingId: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { buildingId },
      include: {
        cois: {
          where: { buildingId },
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
      contactPhone: tenant.contactPhone,
      contactEmail: tenant.contactEmail,
      unitNumber: tenant.unitNumber,
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
      coiExpirationDate: tenant.cois[0]?.expirationDate ?? null,
    }));
  }

  async findByBuildings(buildingIds: string[]) {
    if (!buildingIds.length) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: { buildingId: { in: buildingIds } },
      include: {
        cois: {
          where: {
            buildingId: { in: buildingIds },
          },
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
      contactPhone: tenant.contactPhone,
      contactEmail: tenant.contactEmail,
      buildingId: tenant.buildingId,
      unitNumber: tenant.unitNumber,
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
      coiExpirationDate: tenant.cois[0]?.expirationDate ?? null,
    }));
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        building: true,
        cois: {
          orderBy: { expirationDate: "desc" },
        },
      },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.tenant.findUnique({
      where: { userId },
    });
  }

  update(id: string, data: Partial<UpdateTenantDto>) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async getTenantStats(tenantId: string) {
    const now = new Date();

    const [totalCOIs, activeCOIs, expiredCOIs, pendingCOIs] = await Promise.all(
      [
        this.prisma.cOI.count({ where: { tenantId } }),
        this.prisma.cOI.count({
          where: {
            tenantId,
            status: COIStatus.APPROVED,
            effectiveDate: { lte: now },
            expirationDate: { gt: now },
          },
        }),
        this.prisma.cOI.count({
          where: {
            tenantId,
            expirationDate: { lte: now },
          },
        }),
        this.prisma.cOI.count({
          where: {
            tenantId,
            status: COIStatus.PENDING,
          },
        }),
      ]
    );

    return {
      tenantId,
      totalCOIs,
      activeCOIs,
      expiredCOIs,
      pendingCOIs,
    };
  }

  async sendCOIReminder(tenantId: string, message?: string) {
    // Placeholder for actual notification logic
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    return { ok: true };
  }
}
