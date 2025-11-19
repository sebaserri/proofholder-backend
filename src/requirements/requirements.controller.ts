import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RequirementsService } from "./requirements.service";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "@prisma/client";

class RequirementTemplateDto {
  id: string;
  buildingId: string;
  generalLiabMin?: number;
  autoLiabMin?: number;
  umbrellaMin?: number;
  workersCompRequired: boolean;
  additionalInsuredText?: string;
  certificateHolderText: string;
  active: boolean;
}

class CreateRequirementDto {
  generalLiabMin?: number;
  autoLiabMin?: number;
  umbrellaMin?: number;
  workersCompRequired?: boolean;
  additionalInsuredText?: string;
  certificateHolderText: string;
  active?: boolean;
}

@ApiTags("Requirements")
@ApiBearerAuth()
@Controller("buildings/:buildingId/requirements")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ACCOUNT_OWNER,
  UserRole.PORTFOLIO_MANAGER,
  UserRole.PROPERTY_MANAGER
)
export class RequirementsController {

  constructor(private svc: RequirementsService) {}

  @Get()
  @ApiOperation({ summary: "Listar requisitos del edificio" })
  @ApiParam({ name: "buildingId", required: true })
  @ApiResponse({ status: 200, type: [RequirementTemplateDto] })
  list(@Param("buildingId") buildingId: string) {
    return this.svc.list(buildingId);
  }
  @Post()
  @ApiOperation({ summary: "Crear requisito para un edificio" })
  @ApiParam({ name: "buildingId", required: true })
  @ApiResponse({ status: 201, type: RequirementTemplateDto })
  create(
    @Param("buildingId") buildingId: string,
    @Body() body: CreateRequirementDto
  ) {
    return this.svc.create(buildingId, body);
  }
}
