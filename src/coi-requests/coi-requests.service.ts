import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationHooks } from "../notifications/hooks";

function tokenString(len = 40) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class CoiRequestsService {
  constructor(private prisma: PrismaService, private hooks: NotificationHooks) {}

  async create(buildingId: string, vendorId: string, ttlHours = 168) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!building || !vendor)
      throw new BadRequestException("Building or Vendor not found");
    const token = tokenString();
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const req = await this.prisma.coiRequest.create({
      data: { token, buildingId, vendorId, expiresAt },
      include: { vendor: true, building: true },
     });
    try {
      await this.hooks.onCoiRequestCreated(
        vendor.contactEmail || (vendor as any).email,
        vendor.companyName,
        req.token
      );
    } catch {}
    return { token: req.token, expiresAt };
  }

  async getByToken(token: string) {
    const req = await this.prisma.coiRequest.findUnique({
      where: { token },
      include: { building: true, vendor: true },
    });
    if (!req) throw new BadRequestException("Invalid token");
    if (req.expiresAt < new Date())
      throw new BadRequestException("Token expired");
    return req;
  }

  async markUsed(id: string) {
    return this.prisma.coiRequest.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
