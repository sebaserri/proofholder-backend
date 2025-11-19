import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { FilesService } from "./files.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";

class PresignResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
  bucket: string;
}

@ApiTags("Files")
@ApiBearerAuth()
@Controller("files")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ACCOUNT_OWNER,
  UserRole.PORTFOLIO_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.VENDOR
)
export class FilesController {
  constructor(private files: FilesService) {}

  @Get("presign")
  @ApiOperation({ summary: "Obtener URL prefirmada para subir a S3/MinIO" })
  @ApiQuery({ name: "mime", required: false, example: "application/pdf" })
  @ApiResponse({ status: 200, type: PresignResponse })
  presign(@Query("mime") mime = "application/pdf") {
    return this.files.presign(mime);
  }
}
