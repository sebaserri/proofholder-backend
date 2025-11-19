import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
} from "class-validator";

export class CreateTenantDto {
  @ApiProperty()
  @IsUUID()
  buildingId: string;

  @ApiProperty()
  @IsString()
  businessName: string;

  @ApiProperty()
  @IsString()
  contactName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty()
  @IsEmail()
  contactEmail: string;

  @ApiProperty()
  @IsString()
  unitNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseEndDate?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseEndDate?: string;
}

export class TenantListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  contactName: string;

  @ApiPropertyOptional()
  contactPhone?: string | null;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty()
  unitNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseStartDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaseEndDate?: string | null;

  @ApiPropertyOptional({
    description: "Whether tenant currently has a valid COI",
  })
  hasValidCOI?: boolean;

  @ApiPropertyOptional({
    description: "Expiration date of most recent COI",
  })
  coiExpirationDate?: Date | null;
}

export class TenantByBuildingItemDto extends TenantListItemDto {
  @ApiProperty()
  buildingId: string;
}

export class TenantDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  contactName: string;

  @ApiPropertyOptional()
  contactPhone?: string | null;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty()
  unitNumber: string;

  @ApiPropertyOptional()
  leaseStartDate?: Date | null;

  @ApiPropertyOptional()
  leaseEndDate?: Date | null;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TenantStatsDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  totalCOIs: number;

  @ApiProperty()
  activeCOIs: number;

  @ApiProperty()
  expiredCOIs: number;

  @ApiProperty()
  pendingCOIs: number;
}

// DTO específico para que el tenant suba su propio COI.
// El buildingId se infiere del perfil del tenant en el backend.
export class TenantUploadCOIDto {
  @ApiPropertyOptional({ description: "Número de póliza" })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiPropertyOptional({ description: "Compañía de seguros" })
  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @ApiPropertyOptional({ description: "Fecha de inicio", format: "date" })
  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @ApiProperty({ description: "Fecha de vencimiento", format: "date" })
  @IsString()
  expirationDate: string;

  @ApiPropertyOptional({ description: "Tipos de cobertura" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageType?: string[];

  @ApiPropertyOptional({ description: "Montos de cobertura" })
  @IsOptional()
  coverageAmounts?: any;
}
