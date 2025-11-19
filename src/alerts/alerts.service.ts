import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationHooks } from "../notifications/hooks";
import { NotificationType } from "@prisma/client";

function daysBetween(target: Date, from: Date) {
  const A = new Date(target).setHours(0,0,0,0);
  const B = new Date(from).setHours(0,0,0,0);
  return Math.ceil((A - B) / (1000 * 60 * 60 * 24));
}

@Injectable()
export class AlertsService {
  private logger = new Logger(AlertsService.name);
  constructor(
    private prisma: PrismaService,
    private sms: NotificationsService,
    private hooks: NotificationHooks,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async coisExpiring() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const cois = await this.prisma.cOI.findMany({
      where: {
        expirationDate: { gte: now, lte: in30 },
        status: { in: ["PENDING", "APPROVED"] as any },
      },
      include: { vendor: true, building: true },
    });

    for (const c of cois) {
      if (!c.expirationDate) continue;
      const d = daysBetween(c.expirationDate, now);
      if (![30, 15, 7].includes(d)) continue;
      const tag = `D${d}`;
      const phone = c.vendor?.contactPhone;
      if (!phone) continue;

      const smsSubject = `COI_EXPIRY_SMS_${c.id}_${tag}`;
      const existingSms = await this.prisma.notificationLog
        .findFirst({
          where: {
            type: NotificationType.SMS,
            recipient: phone,
            subject: smsSubject,
          },
        })
        .catch(() => null);
      if (existingSms) {
        this.logger.debug(`Skip duplicate SMS for COI ${c.id} [${tag}]`);
        continue;
      }

      if (!c.vendor || !c.building) continue;

      const vendorName = c.vendor.companyName;
      const buildingName = c.building.name;

      const msg = `Aviso: el COI de ${vendorName} para ${buildingName} vence en ${d} días (el ${new Date(
        c.expirationDate
      ).toLocaleDateString()}). Por favor sube la renovación.`;
      try {
        await this.sms.sendSms(phone, msg);
        await this.prisma.notificationLog.create({
          data: {
            type: NotificationType.SMS,
            recipient: phone,
            subject: smsSubject,
            content: msg,
            status: "sent",
            sentAt: new Date(),
          },
        });
        this.logger.log(`SMS sent to ${phone} for COI ${c.id} [${tag}]`);

        const emailSubject = `COI_EXPIRY_EMAIL_${c.id}_${tag}`;
        const existingEmail = await this.prisma.notificationLog
          .findFirst({
            where: {
              type: NotificationType.EMAIL,
              recipient: c.vendor.contactEmail,
              subject: emailSubject,
            },
          })
          .catch(() => null);
        if (!existingEmail) {
          const vendorEmail =
            c.vendor.contactEmail || (c.vendor as any)?.email || "";

          if (!c.expirationDate) continue;
          const iso = c.expirationDate.toISOString().slice(0, 10);
          try {
            await this.hooks.onCoiExpiry(
              vendorEmail,
              vendorName,
              buildingName,
              d,
              iso
            );
            await this.prisma.notificationLog.create({
              data: {
                type: NotificationType.EMAIL,
                recipient: vendorEmail,
                subject: emailSubject,
                content: `Aviso de vencimiento de COI para ${vendorName} en ${buildingName} (${iso})`,
                status: "sent",
                sentAt: new Date(),
              },
            });
          } catch (e) {
            this.logger.error(`Email expiry failed for COI ${c.id}: ${e}`);
          }
        }        
      } catch (e) {
        this.logger.error(`SMS failed to ${phone} for COI ${c.id}: ${e}`);
      }
    }
  }
}
