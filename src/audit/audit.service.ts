import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditListParams {
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  buildWhere(params: AuditListParams) {
    const where: any = {};
    if (params.entity) where.entityType = params.entity;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lt = new Date(params.to);
    }
    return where;
  }

  async list(params: AuditListParams) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 25)));
    const sort = (params.sort === "asc" ? "asc" : "desc") as "asc" | "desc";

    const where = this.buildWhere(params);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: sort },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      hasNext: page * limit < total,
    };
  }

  async allForExport(params: AuditListParams) {
    const where = this.buildWhere(params);
    const items = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000, // límite razonable
    });
    return items;
  }
}
