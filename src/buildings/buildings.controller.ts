import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PermissionsService } from "../permissions/permissions.service";
import { BuildingsService } from "./buildings.service";
import {
  AssignPropertyManagerDto,
  BuildingDto,
  BuildingStatsDto,
  BuildingWithAccessDto,
  CreateBuildingDto,
  SetBuildingOwnerDto,
  UpdateBuildingDto,
} from "./dto";

@ApiTags("Buildings")
@ApiBearerAuth()
@Controller("buildings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(
    private svc: BuildingsService,
    private permissions: PermissionsService
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar edificios accesibles para el usuario" })
  @ApiResponse({ status: 200, type: [BuildingWithAccessDto] })
  async list(@CurrentUser() user: User) {
    // Todos los roles pueden listar, pero verán diferentes edificios según permisos
    const buildings = await this.permissions.getUserBuildings(user);

    // Agregar información de acceso según el rol
    return buildings.map((building) => ({
      ...building,
      canEdit: this.permissions.canEditBuilding(user),
      canDelete: this.permissions.canDeleteBuilding(user),
      canAssignPM: this.permissions.canAssignPropertyManager(user),
    }));
  }

  @Post()
  @Roles(UserRole.ACCOUNT_OWNER, UserRole.PORTFOLIO_MANAGER)
  @ApiOperation({ summary: "Crear edificio" })
  @ApiResponse({ status: 201, type: BuildingDto })
  async create(@CurrentUser() user: User, @Body() body: CreateBuildingDto) {
    return this.svc.create({
      ...body,
      organizationId: user.organizationId!,
      createdBy: user.id,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, type: BuildingDto })
  @ApiResponse({ status: 403, description: "Sin acceso al edificio" })
  @ApiResponse({ status: 404, description: "Edificio no encontrado" })
  async get(@CurrentUser() user: User, @Param("id") id: string) {
    // Verificar acceso según rol
    const hasAccess = await this.permissions.canViewBuilding(user, id);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    const building = await this.svc.findById(id);
    if (!building) {
      throw new NotFoundException("Edificio no encontrado");
    }

    return building;
  }

  @Patch(":id")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({ summary: "Actualizar edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, type: BuildingDto })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: UpdateBuildingDto
  ) {
    // Verificar acceso
    const hasAccess = await this.permissions.canViewBuilding(user, id);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.update(id, body);
  }

  @Delete(":id")
  @Roles(UserRole.ACCOUNT_OWNER)
  @ApiOperation({ summary: "Eliminar edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Edificio eliminado" })
  async delete(@CurrentUser() user: User, @Param("id") id: string) {
    // Verificar que el edificio pertenece a la organización del usuario
    const building = await this.svc.findById(id);
    if (!building) {
      throw new NotFoundException("Edificio no encontrado");
    }

    if (building.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        "Solo puede eliminar edificios de su organización"
      );
    }

    return this.svc.delete(id);
  }

  @Post(":id/assign-pm")
  @Roles(UserRole.ACCOUNT_OWNER, UserRole.PORTFOLIO_MANAGER)
  @ApiOperation({ summary: "Asignar Property Manager a edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Property Manager asignado" })
  async assignPropertyManager(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Body() body: AssignPropertyManagerDto
  ) {
    // Portfolio Manager solo puede asignar a edificios que controla
    if (user.role === UserRole.PORTFOLIO_MANAGER) {
      const hasAccess = await this.permissions.canViewBuilding(
        user,
        buildingId
      );
      if (!hasAccess) {
        throw new ForbiddenException("No tiene acceso a este edificio");
      }
    } else {
      // Account Owner verifica que el edificio está en su org
      const building = await this.svc.findById(buildingId);
      if (!building || building.organizationId !== user.organizationId) {
        throw new ForbiddenException(
          "Edificio no encontrado en su organización"
        );
      }
    }

    return this.svc.assignPropertyManager(
      buildingId,
      body.propertyManagerId,
      user.id
    );
  }

  @Delete(":id/remove-pm/:pmId")
  @Roles(UserRole.ACCOUNT_OWNER, UserRole.PORTFOLIO_MANAGER)
  @ApiOperation({ summary: "Remover Property Manager de edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiParam({ name: "pmId", description: "ID del Property Manager" })
  @ApiResponse({ status: 200, description: "Property Manager removido" })
  async removePropertyManager(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Param("pmId") pmId: string
  ) {
    // Misma lógica de acceso que assign
    if (user.role === UserRole.PORTFOLIO_MANAGER) {
      const hasAccess = await this.permissions.canViewBuilding(
        user,
        buildingId
      );
      if (!hasAccess) {
        throw new ForbiddenException("No tiene acceso a este edificio");
      }
    }

    return this.svc.removePropertyManager(buildingId, pmId);
  }

  @Get(":id/property-managers")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.BUILDING_OWNER
  )
  @ApiOperation({ summary: "Obtener Property Managers del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Lista de Property Managers" })
  async getPropertyManagers(
    @CurrentUser() user: User,
    @Param("id") buildingId: string
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getPropertyManagers(buildingId);
  }

  @Post(":id/set-owner")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({ summary: "Establecer Building Owner externo" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Building Owner establecido" })
  async setBuildingOwner(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Body() body: SetBuildingOwnerDto
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.setBuildingOwner(buildingId, body.ownerId);
  }

  @Get(":id/stats")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.BUILDING_OWNER
  )
  @ApiOperation({ summary: "Obtener estadísticas del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, type: BuildingStatsDto })
  async getStats(@CurrentUser() user: User, @Param("id") buildingId: string) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getBuildingStats(buildingId);
  }

  @Get(":id/requirements")
  @ApiOperation({ summary: "Obtener requisitos del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Requisitos del edificio" })
  async getRequirements(
    @CurrentUser() user: User,
    @Param("id") buildingId: string
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getActiveRequirements(buildingId);
  }

  @Post(":id/requirements")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({ summary: "Crear nuevos requisitos para el edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 201, description: "Requisitos creados" })
  async createRequirements(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Body() body: any // RequirementTemplateDto
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.createRequirements(buildingId, body);
  }

  @Get(":id/vendors")
  @ApiOperation({ summary: "Obtener vendors autorizados del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "APPROVED", "REJECTED"],
  })
  @ApiResponse({ status: 200, description: "Lista de vendors" })
  async getVendors(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Query("status") status?: string
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getBuildingVendors(buildingId, status);
  }

  @Get(":id/tenants")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.BUILDING_OWNER
  )
  @ApiOperation({ summary: "Obtener inquilinos del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Lista de inquilinos" })
  async getTenants(@CurrentUser() user: User, @Param("id") buildingId: string) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getBuildingTenants(buildingId);
  }

  @Get(":id/guards")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({ summary: "Obtener guardias asignados al edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiResponse({ status: 200, description: "Lista de guardias" })
  async getGuards(@CurrentUser() user: User, @Param("id") buildingId: string) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    return this.svc.getBuildingGuards(buildingId);
  }

  @Get(":id/cois")
  @ApiOperation({ summary: "Obtener COIs del edificio" })
  @ApiParam({ name: "id", description: "ID del edificio" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
  })
  @ApiResponse({ status: 200, description: "Lista de COIs" })
  async getCOIs(
    @CurrentUser() user: User,
    @Param("id") buildingId: string,
    @Query("status") status?: string
  ) {
    const hasAccess = await this.permissions.canViewBuilding(user, buildingId);
    if (!hasAccess) {
      throw new ForbiddenException("No tiene acceso a este edificio");
    }

    // Los guardias solo pueden ver el estado, no los detalles completos
    if (user.role === UserRole.GUARD) {
      return this.svc.getBuildingCOIsSummary(buildingId, status);
    }

    return this.svc.getBuildingCOIs(buildingId, status);
  }
}
