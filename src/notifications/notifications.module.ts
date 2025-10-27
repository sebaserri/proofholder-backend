import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationHooks } from "./hooks";
import { EmailService } from "./email.service";

@Module({
  providers: [EmailService, NotificationsService, NotificationHooks],
  controllers: [NotificationsController],
  exports: [EmailService, NotificationsService, NotificationHooks],
})
export class NotificationsModule {}
