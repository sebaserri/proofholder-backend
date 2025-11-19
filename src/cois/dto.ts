import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
export class CreateCoiDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorId?: string;
  @ApiProperty() @IsString() buildingId: string;
  @ApiProperty() @IsString() insuredName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() producer?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  generalLiabLimit?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  autoLiabLimit?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  umbrellaLimit?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  workersComp?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  additionalInsured?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  waiverOfSubrogation?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificateHolder?: string;
  @ApiProperty() @IsDateString() effectiveDate: string;
  @ApiProperty() @IsDateString() expirationDate: string;
  @ApiProperty({
    required: false,
    type: "array",
    items: {
      type: "object",
      properties: {
        url: { type: "string" },
        kind: { type: "string", enum: ["CERTIFICATE", "ENDORSEMENT", "OTHER"] },
      },
    },
  })
  @IsOptional()
  files?: { url: string; kind: "CERTIFICATE" | "ENDORSEMENT" | "OTHER" }[];
}
export class ReviewCoiDto {
  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED"] })
  @IsString()
  status: "PENDING" | "APPROVED" | "REJECTED";
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, type: "object" }) @IsOptional() flags?: {
    additionalInsured?: boolean;
    waiverOfSubrogation?: boolean;
  };
}
