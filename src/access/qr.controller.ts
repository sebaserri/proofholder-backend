import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import * as QR from "qrcode";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "@prisma/client";

@ApiTags("Access")
@ApiBearerAuth()
@Controller("access")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ACCOUNT_OWNER,
  UserRole.PORTFOLIO_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.GUARD
)
export class AccessQrController {
  @Get("qr")
  @ApiOperation({ summary: "Generar QR con vendorId/buildingId" })
  @ApiQuery({ name: "vendorId", required: true, example: "v_123" })
  @ApiQuery({ name: "buildingId", required: true, example: "b_123" })
  @ApiResponse({
    status: 200,
    description: "PNG image",
    content: { "image/png": {} },
  })
  async qr(
    @Query("vendorId") vendorId: string,
    @Query("buildingId") buildingId: string,
    @Res() res: Response
  ) {
    const url = `${process.env.PUBLIC_APP_URL}/guard/check?vendorId=${vendorId}&buildingId=${buildingId}`;
    const png = await QR.toBuffer(url, { width: 512 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  }
}
