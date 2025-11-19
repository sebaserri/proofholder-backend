import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { NotificationsService } from "./notifications.service";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "@prisma/client";

class TestSmsDto {
  to: string;
  message: string;
}
class SmsResult {
  sid?: string;
  status?: string;
  skipped?: boolean;
}

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ACCOUNT_OWNER,
  UserRole.PORTFOLIO_MANAGER,
  UserRole.PROPERTY_MANAGER
)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}
  @Post("test-sms")
  @ApiOperation({ summary: "Enviar SMS de prueba" })
  @ApiResponse({ status: 200, type: SmsResult })
  test(@Body() body: TestSmsDto) {
    return this.svc.sendSms(body.to, body.message);
  }
}
