import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ExtractService } from "./extract.service";
import { UserRole } from "@prisma/client";

class ExtractResult {
  insuredName?: string;
  producer?: string;
  effectiveDate?: string; // ISO
  expirationDate?: string; // ISO
  generalLiabLimit?: number;
  autoLiabLimit?: number;
  umbrellaLimit?: number;
  workersComp?: boolean;
  additionalInsured?: boolean;
  waiverOfSubrogation?: boolean;
  certificateHolder?: string;
  confidence?: number;
  fields?: Record<string, any>;
}

class ApplyExtractDto {
  insuredName?: string;
  producer?: string;
  effectiveDate?: string;
  expirationDate?: string;
  generalLiabLimit?: number;
  autoLiabLimit?: number;
  umbrellaLimit?: number;
  workersComp?: boolean;
  additionalInsured?: boolean;
  waiverOfSubrogation?: boolean;
  certificateHolder?: string;
  [key: string]: any;
}

class ApplyResult {
  ok: boolean;
  coiId: string;
  appliedFields?: string[];
}

@ApiTags("Extract")
@ApiBearerAuth()
@Controller("extract")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ACCOUNT_OWNER,
  UserRole.PORTFOLIO_MANAGER,
  UserRole.PROPERTY_MANAGER
)
export class ExtractController {
  constructor(private readonly svc: ExtractService) {}

  @Post("coi/:id")
  @ApiOperation({ summary: "Ejecuta extracción OCR/LLM para un COI existente" })
  @ApiParam({ name: "id", description: "COI ID" })
  @ApiResponse({ status: 200, type: ExtractResult })
  extract(@Param("id") id: string) {
    return this.svc.extractFromCoiId(id);
  }

  @Patch("coi/:id/apply")
  @ApiOperation({ summary: "Aplica campos extraídos al COI" })
  @ApiParam({ name: "id", description: "COI ID" })
  @ApiBody({ type: ApplyExtractDto })
  @ApiResponse({ status: 200, type: ApplyResult })
  apply(@Param("id") id: string, @Body() body: ApplyExtractDto) {
    return this.svc.applyToCoi(id, body);
  }
}
