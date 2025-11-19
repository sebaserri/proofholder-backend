import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

// ==================== DTOs BÁSICOS (con Swagger) ====================

export class CreateVendorDto {
  @ApiProperty({ description: "Razón social del vendor" })
  @IsString()
  legalName: string;

  @ApiProperty({ description: "Email de contacto" })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ description: "Nombre del contacto" })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: "Tipos de servicio",
    example: ["plumbing", "electrical", "hvac"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceType?: string[];
}

export class VendorDto {
  @ApiProperty({ description: "ID del vendor" })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "Razón social del vendor" })
  @IsString()
  legalName: string;

  @ApiProperty({ description: "Email de contacto" })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "Nombre del contacto" })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: "Tipos de servicio",
    example: ["plumbing", "electrical", "hvac"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceType?: string[];
}

export class VendorSearchItem {
  @ApiProperty({ description: "ID del vendor" })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "Razón social del vendor" })
  @IsString()
  legalName: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

// ==================== DTOs CON VALIDACIÓN PARA API ====================

export class UpdateVendorDto {
  @ApiPropertyOptional({ description: "Razón social del vendor" })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: "Nombre de la compañía" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: "Nombre del contacto" })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "Email de contacto" })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: "Tipos de servicio",
    example: ["plumbing", "electrical", "hvac"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceType?: string[];
}

// ==================== DTOs PARA APROBACIÓN/RECHAZO ====================

export class ApproveVendorDto {
  @ApiProperty({ description: "ID del edificio" })
  @IsUUID()
  buildingId: string;

  @ApiPropertyOptional({ description: "Notas de aprobación" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectVendorDto {
  @ApiProperty({ description: "ID del edificio" })
  @IsUUID()
  buildingId: string;

  @ApiPropertyOptional({ description: "Razón del rechazo" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ==================== DTOs PARA COIs ====================

export class UploadCOIDto {
  @ApiProperty({ description: "ID del edificio" })
  @IsUUID()
  buildingId: string;

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

// ==================== DTOs PARA RESPUESTAS ====================

export class VendorWithAuthorizationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  contactName: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED"] })
  authorizationStatus: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiProperty({ description: "Si tiene COI vigente" })
  hasValidCOI: boolean;

  @ApiPropertyOptional({ description: "Fecha de vencimiento del COI actual" })
  coiExpirationDate?: Date;

  @ApiPropertyOptional({ description: "Edificios donde está autorizado" })
  buildings?: any[];
}

export class VendorAuthorizationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  buildingName: string;

  @ApiProperty()
  buildingAddress: string;

  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED"] })
  status: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}

// ==================== DTOs PARA ESTADÍSTICAS ====================

export class VendorStatsDto {
  @ApiProperty({ description: "ID del vendor" })
  vendorId: string;

  @ApiProperty({ description: "Nombre del vendor" })
  vendorName: string;

  @ApiProperty({ description: "Total de edificios donde está registrado" })
  totalBuildings: number;

  @ApiProperty({ description: "Edificios donde está aprobado" })
  approvedBuildings: number;

  @ApiProperty({ description: "Total de COIs" })
  totalCOIs: number;

  @ApiProperty({ description: "COIs activos" })
  activeCOIs: number;

  @ApiProperty({ description: "COIs vencidos" })
  expiredCOIs: number;

  @ApiProperty({ description: "COIs pendientes de revisión" })
  pendingCOIs: number;

  @ApiProperty({
    description:
      "Porcentaje de cumplimiento (COIs activos / edificios aprobados)",
  })
  complianceRate: number;

  @ApiPropertyOptional({ description: "Fecha del último COI subido" })
  lastCOIUploadDate?: Date;

  @ApiPropertyOptional({ description: "Próxima fecha de vencimiento de COI" })
  nextCOIExpirationDate?: Date;

  @ApiPropertyOptional({ description: "Tipos de servicio" })
  serviceTypes?: string[];
}

// ==================== DTOs PARA LISTADOS Y FILTROS ====================

export class VendorListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  contactName: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  contactEmail: string;

  @ApiPropertyOptional()
  serviceType?: string[];

  @ApiProperty({ description: "Número de edificios donde está autorizado" })
  authorizedBuildings: number;

  @ApiProperty({ description: "Número de COIs activos" })
  activeCOIs: number;

  @ApiPropertyOptional({ description: "Último login del usuario" })
  lastLoginAt?: Date;
}

export class VendorFilterDto {
  @ApiPropertyOptional({ description: "Búsqueda por texto" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Filtrar por edificio" })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ description: "Filtrar por tipo de servicio" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceType?: string[];

  @ApiPropertyOptional({
    description: "Filtrar por estado de autorización",
    enum: ["PENDING", "APPROVED", "REJECTED"],
  })
  @IsOptional()
  @IsEnum(["PENDING", "APPROVED", "REJECTED"])
  authStatus?: string;

  @ApiPropertyOptional({ description: "Solo vendors con COI vigente" })
  @IsOptional()
  @IsBoolean()
  hasValidCOI?: boolean;

  @ApiPropertyOptional({ description: "Límite de resultados", default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: "Offset para paginación" })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

// ==================== DTOs PARA INVITACIÓN ====================

export class InviteVendorDto {
  @ApiProperty({ description: "Email del vendor a invitar" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Nombre de la compañía" })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ description: "Nombre del contacto" })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: "Edificios a los que tendrá acceso" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  buildingIds?: string[];

  @ApiPropertyOptional({
    description: "Mensaje personalizado para la invitación",
  })
  @IsOptional()
  @IsString()
  invitationMessage?: string;
}

// ==================== DTOs PARA BULK OPERATIONS ====================

export class BulkApproveVendorsDto {
  @ApiProperty({ description: "IDs de vendors a aprobar" })
  @IsArray()
  @IsUUID("4", { each: true })
  vendorIds: string[];

  @ApiProperty({ description: "ID del edificio" })
  @IsUUID()
  buildingId: string;

  @ApiPropertyOptional({ description: "Notas de aprobación" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpdateVendorsDto {
  @ApiProperty({ description: "IDs de vendors a actualizar" })
  @IsArray()
  @IsUUID("4", { each: true })
  vendorIds: string[];

  @ApiPropertyOptional({ description: "Tipos de servicio a asignar" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceType?: string[];

  @ApiPropertyOptional({ description: "Actualizar estado de autorización" })
  @IsOptional()
  @IsEnum(["APPROVED", "REJECTED"])
  authStatus?: string;
}

// ==================== DTOs PARA NOTIFICACIONES ====================

export class NotifyVendorDto {
  @ApiProperty({ description: "ID del vendor" })
  @IsUUID()
  vendorId: string;

  @ApiProperty({
    description: "Tipo de notificación",
    enum: ["COI_EXPIRING", "COI_EXPIRED", "APPROVAL", "REJECTION", "CUSTOM"],
  })
  @IsEnum(["COI_EXPIRING", "COI_EXPIRED", "APPROVAL", "REJECTION", "CUSTOM"])
  notificationType: string;

  @ApiPropertyOptional({ description: "Mensaje personalizado" })
  @IsOptional()
  @IsString()
  customMessage?: string;

  @ApiPropertyOptional({ description: "Enviar por SMS además de email" })
  @IsOptional()
  @IsBoolean()
  sendSMS?: boolean;
}

// ==================== TYPES PARA COMPATIBILIDAD ====================

export type VendorSearchResponse = VendorSearchItem[];
export type VendorDetailResponse = VendorDto & {
  authorizations?: VendorAuthorizationDto[];
  stats?: Partial<VendorStatsDto>;
};
