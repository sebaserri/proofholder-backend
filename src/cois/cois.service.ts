import { Injectable } from "@nestjs/common";
import { AuditAction, COIStatus } from "@prisma/client";
import { NotificationHooks } from "../notifications/hooks";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCoiDto } from "./dto";

type ReviewPayload = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string;
  flags?: { additionalInsured?: boolean; waiverOfSubrogation?: boolean };
};

@Injectable()
export class CoisService {
  constructor(
    private prisma: PrismaService,
    private hooks: NotificationHooks
  ) {}

  list(filter: any) {
    return this.prisma.cOI.findMany({
      where: {
        buildingId: filter.buildingId || undefined,
        status: filter.status || undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { files: true, vendor: true, building: true },
    });
  }

  async create(dto: CreateCoiDto) {
    return this.prisma.cOI.create({
      data: {
        vendorId: dto.vendorId,
        tenantId: dto.tenantId,
        buildingId: dto.buildingId,
        status: COIStatus.PENDING,
        insuranceCompany: dto.producer,
        coverageAmounts: {
          insuredName: dto.insuredName,
          generalLiabLimit: dto.generalLiabLimit,
          autoLiabLimit: dto.autoLiabLimit,
          umbrellaLimit: dto.umbrellaLimit,
          workersComp: dto.workersComp,
          certificateHolder: dto.certificateHolder,
        },
        additionalInsured: dto.additionalInsured,
        waiverSubrogation: dto.waiverOfSubrogation ?? false,
        effectiveDate: new Date(dto.effectiveDate),
        expirationDate: new Date(dto.expirationDate),
        files: dto.files
          ? {
              create: dto.files.map((f) => ({
                fileUrl: f.url,
                mimeType: "application/pdf",
              })),
            }
          : undefined,
      },
      include: { files: true },
    });
  }

  get(id: string) {
    return this.prisma.cOI.findUnique({
      where: { id },
      include: { files: true, vendor: true, building: true },
    });
  }

  async findByVendor(vendorId: string, buildingId?: string) {
    return this.prisma.cOI.findMany({
      where: {
        vendorId,
        buildingId: buildingId || undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { files: true, building: true },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.cOI.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: "desc" },
      include: { files: true, building: true },
    });
  }

  async review(id: string, body: ReviewPayload, actorId?: string) {
    const data: any = {
      status: body.status as COIStatus,
      reviewNotes: body.notes,
    };
    if (body.flags?.additionalInsured !== undefined) {
      data.additionalInsured = body.flags.additionalInsured;
    }
    if (body.flags?.waiverOfSubrogation !== undefined) {
      data.waiverSubrogation = body.flags.waiverOfSubrogation;
    }

    const coi = await this.prisma.cOI.update({
      where: { id },
      data,
      include: { files: true, vendor: true, building: true },
    });

    if (body.status === "REJECTED") {
      try {
        const email = coi.vendor?.contactEmail || (coi.vendor as any)?.email;
        const name = coi.vendor?.companyName || "Proveedor";
        await this.hooks.onCoiRejected(email, name, coi.id, body.notes || "");
      } catch {}
    }
    await this.prisma.auditLog
      .create({
        data: {
          entityType: "COI",
          entityId: id,
          action: AuditAction.REVIEW_COI,
          actorId: actorId || "system",
          metadata: {
            status: body.status,
            notes: body.notes || null,
          },
        } as any,
      })
      .catch(() => {});

    return coi;
  }
}
