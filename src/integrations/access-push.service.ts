import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessPushService {
  private logger = new Logger(AccessPushService.name);
  constructor(private prisma: PrismaService) {}

  async notify(
    buildingId: string,
    vendorId: string,
    status: "APPROVED" | "REJECTED",
    meta?: any
  ) {
    const cfg = await this.prisma.buildingIntegration.findFirst({
      where: { buildingId, integrationType: "ACCESS_WEBHOOK", active: true },
    });
    if (!cfg?.webhookUrl)
      return { ok: false, reason: "No webhook configured" };
    try {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": cfg.apiKey || "",
        },
        body: JSON.stringify({
          buildingId,
          vendorId,
          status,
          meta,
          at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(
          Number(process.env.ACCESS_PUSH_TIMEOUT_MS || 5000)
        ),
      });
      this.logger.log(
        `Access push sent for vendor=${vendorId} building=${buildingId} -> ${status}`
      );
      return { ok: true };
    } catch (e) {
      this.logger.error(`Access push failed: ${e}`);
      return { ok: false, error: String(e) };
    }
  }
}
