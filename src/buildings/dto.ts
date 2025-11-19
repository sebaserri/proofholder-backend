import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID
} from "class-validator";

// ==================== DTOs BÁSICOS ====================

export class CreateBuildingDto {
  @ApiProperty({ description: "Nombre del edificio" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Dirección del edificio" })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: "Ciudad" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Estado/Provincia" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: "Código postal" })
  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class BuildingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  zipCode?: string;

  @ApiPropertyOptional({ description: "ID de la organización propietaria" })
  organizationId?: string;

  @ApiPropertyOptional({ description: "ID del Building Owner externo" })
  ownerId?: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdateBuildingDto {
  @ApiPropertyOptional({ description: "Nombre del edificio" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Dirección del edificio" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Ciudad" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Estado/Provincia" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: "Código postal" })
  @IsOptional()
  @IsString()
  zipCode?: string;
}

// ==================== DTOs PARA GESTIÓN DE USUARIOS ====================

export class AssignPropertyManagerDto {
  @ApiProperty({ description: "ID del Property Manager a asignar" })
  @IsUUID()
  propertyManagerId: string;
}

export class SetBuildingOwnerDto {
  @ApiProperty({ description: "ID del Building Owner (usuario externo)" })
  @IsUUID()
  ownerId: string;
}

export class PropertyManagerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  assignedAt: Date;

  @ApiProperty()
  assignedBy: string;
}

// ==================== DTOs CON INFORMACIÓN ADICIONAL ====================

export class BuildingWithAccessDto extends BuildingDto {
  @ApiProperty({ description: "Si el usuario actual puede editar el edificio" })
  canEdit: boolean;

  @ApiProperty({
    description: "Si el usuario actual puede eliminar el edificio",
  })
  canDelete: boolean;

  @ApiProperty({
    description: "Si el usuario actual puede asignar Property Managers",
  })
  canAssignPM: boolean;
}

export class BuildingStatsDto {
  @ApiProperty({ description: "ID del edificio" })
  buildingId: string;

  @ApiProperty({ description: "Nombre del edificio" })
  buildingName: string;

  @ApiProperty({ description: "Total de vendors autorizados" })
  totalVendors: number;

  @ApiProperty({ description: "Vendors con COI vigente" })
  vendorsWithValidCOI: number;

  @ApiProperty({ description: "Vendors con COI vencido" })
  vendorsWithExpiredCOI: number;

  @ApiProperty({ description: "Vendors sin COI" })
  vendorsWithoutCOI: number;

  @ApiProperty({ description: "Total de inquilinos" })
  totalTenants: number;

  @ApiProperty({ description: "Inquilinos con COI vigente" })
  tenantsWithValidCOI: number;

  @ApiProperty({ description: "Total de guardias asignados" })
  totalGuards: number;

  @ApiProperty({ description: "Total de COIs" })
  totalCOIs: number;

  @ApiProperty({ description: "COIs pendientes de revisión" })
  pendingCOIs: number;

  @ApiProperty({ description: "COIs aprobados" })
  approvedCOIs: number;

  @ApiProperty({ description: "COIs rechazados" })
  rejectedCOIs: number;

  @ApiProperty({ description: "COIs vencidos" })
  expiredCOIs: number;

  @ApiPropertyOptional({ description: "Fecha del último COI aprobado" })
  lastCOIApprovalDate?: Date;

  @ApiPropertyOptional({ description: "Próxima fecha de vencimiento de COI" })
  nextCOIExpirationDate?: Date;
}

// ==================== DTOs PARA REQUISITOS ====================

export class RequirementTemplateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ description: "General Liability requerido" })
  glRequired: boolean;

  @ApiPropertyOptional({ description: "GL mínimo por ocurrencia" })
  glMinOccurrence?: number;

  @ApiPropertyOptional({ description: "GL mínimo agregado" })
  glMinAggregate?: number;

  @ApiProperty({ description: "Auto Liability requerido" })
  autoRequired: boolean;

  @ApiPropertyOptional({ description: "Auto mínimo combinado" })
  autoMinCombined?: number;

  @ApiProperty({ description: "Umbrella requerido" })
  umbrellaRequired: boolean;

  @ApiPropertyOptional({ description: "Umbrella límite mínimo" })
  umbrellaMinLimit?: number;

  @ApiProperty({ description: "Workers Comp requerido" })
  wcRequired: boolean;

  @ApiProperty({ description: "Additional Insured requerido" })
  additionalInsuredRequired: boolean;

  @ApiProperty({ description: "Waiver of Subrogation requerido" })
  waiverSubrogationRequired: boolean;

  @ApiProperty({ description: "Primary & Non-Contributory requerido" })
  primaryNonContribRequired: boolean;

  @ApiPropertyOptional({
    description: "Días mínimos de notice of cancellation",
  })
  noticeOfCancelMin?: number;

  @ApiPropertyOptional({ description: "Texto del certificate holder" })
  holderName?: string;

  @ApiPropertyOptional({ description: "Dirección del certificate holder" })
  holderAddress?: string;

  @ApiPropertyOptional({ description: "Texto de additional insured" })
  additionalInsuredText?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateRequirementTemplateDto {
  @ApiProperty({ description: "Nombre de la plantilla" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Si está activa", default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: "General Liability requerido", default: true })
  @IsOptional()
  @IsBoolean()
  glRequired?: boolean;

  @ApiPropertyOptional({
    description: "GL mínimo por ocurrencia",
    default: 1000000,
  })
  @IsOptional()
  @IsNumber()
  glMinOccurrence?: number;

  @ApiPropertyOptional({ description: "GL mínimo agregado", default: 2000000 })
  @IsOptional()
  @IsNumber()
  glMinAggregate?: number;

  @ApiProperty({ description: "Auto Liability requerido", default: false })
  @IsOptional()
  @IsBoolean()
  autoRequired?: boolean;

  @ApiPropertyOptional({ description: "Auto mínimo combinado" })
  @IsOptional()
  @IsNumber()
  autoMinCombined?: number;

  @ApiProperty({ description: "Umbrella requerido", default: false })
  @IsOptional()
  @IsBoolean()
  umbrellaRequired?: boolean;

  @ApiPropertyOptional({ description: "Umbrella límite mínimo" })
  @IsOptional()
  @IsNumber()
  umbrellaMinLimit?: number;

  @ApiProperty({ description: "Workers Comp requerido", default: false })
  @IsOptional()
  @IsBoolean()
  wcRequired?: boolean;

  @ApiProperty({ description: "Additional Insured requerido", default: true })
  @IsOptional()
  @IsBoolean()
  additionalInsuredRequired?: boolean;

  @ApiProperty({
    description: "Waiver of Subrogation requerido",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waiverSubrogationRequired?: boolean;

  @ApiProperty({
    description: "Primary & Non-Contributory requerido",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  primaryNonContribRequired?: boolean;

  @ApiPropertyOptional({
    description: "Días mínimos de notice of cancellation",
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  noticeOfCancelMin?: number;

  @ApiPropertyOptional({ description: "Texto del certificate holder" })
  @IsOptional()
  @IsString()
  holderName?: string;

  @ApiPropertyOptional({ description: "Dirección del certificate holder" })
  @IsOptional()
  @IsString()
  holderAddress?: string;

  @ApiPropertyOptional({ description: "Texto de additional insured" })
  @IsOptional()
  @IsString()
  additionalInsuredText?: string;
}

// ==================== DTOs PARA LISTADOS ====================

export class VendorSummaryDto {
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
}

export class TenantSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  contactName: string;

  @ApiProperty()
  unitNumber: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  contactEmail: string;

  @ApiPropertyOptional()
  leaseStartDate?: Date;

  @ApiPropertyOptional()
  leaseEndDate?: Date;

  @ApiProperty({ description: "Si tiene COI vigente" })
  hasValidCOI: boolean;

  @ApiPropertyOptional({ description: "Fecha de vencimiento del COI actual" })
  coiExpirationDate?: Date;
}

export class GuardSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  employeeId?: string;

  @ApiProperty()
  assignedAt: Date;

  @ApiProperty()
  assignedBy: string;
}

export class COISummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  vendorId?: string;

  @ApiPropertyOptional()
  vendorName?: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional()
  tenantName?: string;

  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"] })
  status: string;

  @ApiProperty()
  effectiveDate: Date;

  @ApiProperty()
  expirationDate: Date;

  @ApiPropertyOptional({ description: "Solo para guardias: estado de acceso" })
  accessStatus?: "APPROVED" | "REJECTED";
}

// ==================== DTOs PARA BÚSQUEDA Y FILTROS ====================

export class BuildingFilterDto {
  @ApiPropertyOptional({ description: "Filtrar por ciudad" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Filtrar por estado" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: "Filtrar por owner ID" })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Incluir estadísticas" })
  @IsOptional()
  @IsBoolean()
  includeStats?: boolean;
}

export class BuildingSearchDto {
  @ApiProperty({ description: "Término de búsqueda" })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: "Límite de resultados", default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
