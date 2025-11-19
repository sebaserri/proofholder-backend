import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SecurityModule } from "../security/security.module";
import { CoisController } from "./cois.controller";
import { CoisService } from "./cois.service";

@Module({
  imports: [PrismaModule, NotificationsModule, SecurityModule],
  controllers: [CoisController],
  providers: [CoisService],
  exports: [CoisService],
})
export class CoisModule {}
