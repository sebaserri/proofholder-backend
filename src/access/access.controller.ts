import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { AccessService } from "./access.service";
import { CheckResponse } from "./checkResponse.dto";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
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
export class AccessController {
  constructor(private svc: AccessService) {}
  @Get("check")
  @ApiOperation({ summary: "Consultar APPROVED/REJECTED" })
  @ApiQuery({ name: "vendorId", required: true })
  @ApiQuery({ name: "buildingId", required: true })
  check(
    @Query("vendorId") vendorId: string,
    @Query("buildingId") buildingId: string
  ): Promise<CheckResponse> {
    return this.svc.check(vendorId, buildingId) as any;
  }
  @Get("vendors")
  @ApiOperation({ summary: "Listado resumido por edificio" })
  @ApiQuery({ name: "buildingId", required: true })
  list(@Query("buildingId") buildingId: string) {
    return this.svc.listByBuilding(buildingId);
  }
}
