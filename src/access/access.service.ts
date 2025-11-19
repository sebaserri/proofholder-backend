import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  private isWithinValidity = (eff?: Date | null, exp?: Date | null, ref = new Date()) => {
    return !!(eff && exp && eff <= ref && exp >= ref);
  }

  async check(vendorId: string, buildingId: string) {
    const coi = await this.prisma.cOI.findFirst({
      where: { vendorId, buildingId, status: "APPROVED" as any },
      orderBy: { createdAt: "desc" },
    });
    if (!coi)
      return { apto: false, reason: "No hay COI aprobado", coiId: null };
    const now = new Date();
    const apto = this.isWithinValidity(coi.effectiveDate, coi.expirationDate, now);
    return {
      apto,
      reason: apto ? "Vigente" : "Fuera de vigencia",
      coiId: coi.id,
      status: coi.status,
      effectiveDate: coi.effectiveDate,
      expirationDate: coi.expirationDate,
      vendorId: coi.vendorId,
      buildingId: coi.buildingId,
    };
  }

  async listByBuilding(buildingId: string) {
    const vendors = await this.prisma.vendor.findMany({});
    const results: any[] = [];
    for (const v of vendors) {
      const r = await this.check(v.id, buildingId);
      results.push({ vendorId: v.id, vendorName: v.companyName, ...r });
    }
    return results;
  }
}
