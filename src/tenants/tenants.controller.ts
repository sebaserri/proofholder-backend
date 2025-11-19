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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { User, UserRole } from "@prisma/client";
import { PermissionsService } from "../permissions/permissions.service";
import { JwtAuthGuard } from "src/auth/jwt.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { CoisService } from "src/cois/cois.service";
import { TenantsService } from "./tenants.service";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantListItemDto,
  TenantByBuildingItemDto,
  TenantDetailDto,
  TenantStatsDto,
  TenantUploadCOIDto,
} from "./dto";
import { UploadCOIDto } from "src/vendors/dto";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Tenants")
@ApiBearerAuth()
@Controller("tenants")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly coisService: CoisService,
    private readonly permissionsService: PermissionsService
  ) {}

  /**
   * Maps a COI entity to a lightweight list item for tenants,
   * exposing only the fields needed by the frontend (including files).
   */
  private mapTenantCoiListItem(coi: any) {
    const coverage = (coi.coverageAmounts || {}) as any;

    return {
      id: coi.id,
      vendorId: coi.vendorId,
      buildingId: coi.buildingId,
      building: coi.building
        ? {
            id: coi.building.id,
            name: coi.building.name,
          }
        : undefined,
      insuredName: coverage.insuredName,
      effectiveDate: coi.effectiveDate ?? undefined,
      expirationDate: coi.expirationDate ?? undefined,
      status: coi.status,
      createdAt: coi.createdAt,
      uploadedAt:
        Array.isArray(coi.files) && coi.files.length > 0
          ? coi.files[0].uploadedAt
          : undefined,
      files: Array.isArray(coi.files)
        ? coi.files.map((f: any) => ({
            id: f.id,
            url: f.fileUrl,
            // We don't persist "kind" yet; default to CERTIFICATE for now
            kind: ("CERTIFICATE" as any) as string,
          }))
        : [],
    };
  }

  /**
   * Create a new tenant
   * Only management roles can create tenants
   */
  @Post()
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary:
      "Create a new tenant (ACCOUNT_OWNER, PORTFOLIO_MANAGER, PROPERTY_MANAGER)",
  })
  @ApiResponse({ status: 201, description: "Tenant created" })
  async create(
    @CurrentUser() user: User,
    @Body() createTenantDto: CreateTenantDto
  ) {
    // Check if user has access to the building
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      createTenantDto.buildingId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this building");
    }

    return this.tenantsService.create(createTenantDto, user.id);
  }

  /**
   * Get all tenants in accessible buildings
   * Management and Building Owners can see tenants
   */
  @Get()
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.BUILDING_OWNER
  )
  @ApiOperation({
    summary:
      "List tenants in accessible buildings (management & building owners)",
  })
  @ApiQuery({ name: "buildingId", required: false })
  @ApiResponse({ status: 200, type: [TenantListItemDto] })
  async findAll(
    @CurrentUser() user: User,
    @Query("buildingId") buildingId?: string
  ) {
    if (buildingId) {
      // Check access to specific building
      const hasAccess = await this.permissionsService.canViewBuilding(
        user,
        buildingId
      );
      if (!hasAccess) {
        throw new ForbiddenException("You do not have access to this building");
      }
      return this.tenantsService.findByBuilding(buildingId);
    }

    // Get all tenants from user's accessible buildings
    const buildings = await this.permissionsService.getUserBuildings(user);
    const buildingIds = buildings.map((b) => b.id);
    return this.tenantsService.findByBuildings(buildingIds);
  }

  /**
   * Get tenant details
   * Tenants can see their own info, management can see all in their buildings
   */
  @Get(":id")
  @ApiOperation({
    summary:
      "Get tenant details (self for TENANT, or management with building access)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 200, description: "Tenant detail" })
  @ApiResponse({ status: 404, description: "Tenant not found" })
  async findOne(@CurrentUser() user: User, @Param("id") id: string) {
    const tenant = await this.tenantsService.findOne(id);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Tenants can only see their own info
    if (user.role === UserRole.TENANT) {
      if (tenant.userId !== user.id) {
        throw new ForbiddenException(
          "You can only view your own tenant profile"
        );
      }
      return tenant;
    }

    // Others need building access
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      tenant.buildingId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this tenant");
    }

    return tenant;
  }

  /**
   * Update tenant information
   * Tenants can update their own contact info, management can update everything
   */
  @Patch(":id")
  @ApiOperation({
    summary:
      "Update tenant (self-contact info for TENANT, full update for management)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 200, description: "Tenant updated" })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto
  ) {
    const tenant = await this.tenantsService.findOne(id);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    if (user.role === UserRole.TENANT) {
      // Tenants can only update their own profile
      if (tenant.userId !== user.id) {
        throw new ForbiddenException(
          "You can only update your own tenant profile"
        );
      }
      // Limited update for tenants (only contact info)
      const limitedUpdate = {
        contactName: updateTenantDto.contactName,
        contactPhone: updateTenantDto.contactPhone,
        contactEmail: updateTenantDto.contactEmail,
      };
      return this.tenantsService.update(id, limitedUpdate);
    }

    // Management needs building access
    if (this.permissionsService.canInviteTenant(user)) {
      const hasAccess = await this.permissionsService.canViewBuilding(
        user,
        tenant.buildingId
      );
      if (!hasAccess) {
        throw new ForbiddenException("You do not have access to this building");
      }
      return this.tenantsService.update(id, updateTenantDto);
    }

    throw new ForbiddenException(
      "You do not have permission to update tenants"
    );
  }

  /**
   * Delete a tenant
   * Only management roles can delete tenants
   */
  @Delete(":id")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary:
      "Delete tenant (ACCOUNT_OWNER, PORTFOLIO_MANAGER, PROPERTY_MANAGER)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 200, description: "Tenant deleted" })
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    const tenant = await this.tenantsService.findOne(id);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Check building access
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      tenant.buildingId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this building");
    }

    return this.tenantsService.remove(id);
  }

  /**
   * Upload COI as a tenant
   * Only tenants can upload their own COIs
   */
  @Post("upload-coi")
  @Roles(UserRole.TENANT)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload COI as tenant (TENANT only)" })
  @ApiResponse({ status: 201, description: "COI created for tenant" })
  async uploadCOI(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: TenantUploadCOIDto
  ) {
    // Get tenant from user
    const tenant = await this.tenantsService.findByUserId(user.id);

    if (!tenant) {
      throw new NotFoundException("Tenant profile not found");
    }

    return this.coisService.create({
      tenantId: tenant.id,
      ...dto,
      buildingId: tenant.buildingId,
    } as any);
  }

  /**
   * Upload COI for a tenant as management
   * Management roles can upload COIs on behalf of tenants in buildings they manage
   */
  @Post(":id/upload-coi")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary:
      "Upload COI for tenant (ACCOUNT_OWNER, PORTFOLIO_MANAGER, PROPERTY_MANAGER)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 201, description: "COI created for tenant" })
  async uploadCOIForTenant(
    @CurrentUser() user: User,
    @Param("id") tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadCOIDto
  ) {
    const tenant = await this.tenantsService.findOne(tenantId);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Ensure user can manage COIs and has building access
    const canManage = this.permissionsService.canManageCOIs(user);
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      tenant.buildingId
    );

    if (!canManage || !hasAccess) {
      throw new ForbiddenException(
        "You do not have permission to upload COIs for this tenant"
      );
    }

    // Enforce building scope: override or validate buildingId
    if (dto.buildingId && dto.buildingId !== tenant.buildingId) {
      throw new ForbiddenException(
        "Invalid building for this tenant COI upload"
      );
    }

    return this.coisService.create({
      tenantId: tenant.id,
      ...dto,
      buildingId: tenant.buildingId,
    } as any);
  }

  /**
   * Get my COI (for tenants)
   * Tenants can view their own COI
   */
  @Get("my-coi")
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: "Get my COIs as tenant (TENANT only)" })
  @ApiResponse({ status: 200, description: "List of COIs for current tenant" })
  async getMyCOI(@CurrentUser() user: User) {
    const tenant = await this.tenantsService.findByUserId(user.id);

    if (!tenant) {
      throw new NotFoundException("Tenant profile not found");
    }

    const cois = await this.coisService.findByTenant(tenant.id);
    return cois.map((c) => this.mapTenantCoiListItem(c));
  }

  /**
   * Get tenant's COIs
   * Tenants see their own, management sees all
   */
  @Get(":id/cois")
  @ApiOperation({
    summary:
      "Get tenant COIs (self for TENANT, or management with building access)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 200, description: "List of COIs for tenant" })
  async getTenantCOIs(
    @CurrentUser() user: User,
    @Param("id") tenantId: string
  ) {
    const tenant = await this.tenantsService.findOne(tenantId);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Tenants can only see their own COIs
    if (user.role === UserRole.TENANT) {
      if (tenant.userId !== user.id) {
        throw new ForbiddenException("You can only view your own COIs");
      }
      const cois = await this.coisService.findByTenant(tenantId);
      return cois.map((c) => this.mapTenantCoiListItem(c));
    }

    // Management needs building access
    if (this.permissionsService.canManageCOIs(user)) {
      const hasAccess = await this.permissionsService.canViewBuilding(
        user,
        tenant.buildingId
      );
      if (!hasAccess) {
        throw new ForbiddenException("You do not have access to this building");
      }
      const cois = await this.coisService.findByTenant(tenantId);
      return cois.map((c) => this.mapTenantCoiListItem(c));
    }

    throw new ForbiddenException(
      "You do not have permission to view tenant COIs"
    );
  }

  /**
   * Get tenants by building
   * Available to management and building owners
   */
  @Get("building/:buildingId")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER,
    UserRole.BUILDING_OWNER
  )
  @ApiOperation({
    summary:
      "Get tenants for a building (management & building owners with access)",
  })
  @ApiParam({ name: "buildingId", description: "Building ID" })
  @ApiResponse({ status: 200, type: [TenantByBuildingItemDto] })
  async getByBuilding(
    @CurrentUser() user: User,
    @Param("buildingId") buildingId: string
  ) {
    // Check building access
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      buildingId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this building");
    }

    return this.tenantsService.findByBuilding(buildingId);
  }

  /**
   * Get tenant statistics
   * Management only
   */
  @Get(":id/stats")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  async getTenantStats(
    @CurrentUser() user: User,
    @Param("id") tenantId: string
  ) {
    const tenant = await this.tenantsService.findOne(tenantId);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Check building access
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      tenant.buildingId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this building");
    }

    return this.tenantsService.getTenantStats(tenantId) as Promise<TenantStatsDto>;
  }

  /**
   * Send COI reminder to tenant
   * Management only
   */
  @Post(":id/send-reminder")
  @Roles(
    UserRole.ACCOUNT_OWNER,
    UserRole.PORTFOLIO_MANAGER,
    UserRole.PROPERTY_MANAGER
  )
  @ApiOperation({
    summary:
      "Send COI reminder to tenant (ACCOUNT_OWNER, PORTFOLIO_MANAGER, PROPERTY_MANAGER)",
  })
  @ApiParam({ name: "id", description: "Tenant ID" })
  @ApiResponse({ status: 200, description: "Reminder queued/sent" })
  async sendReminder(
    @CurrentUser() user: User,
    @Param("id") tenantId: string,
    @Body() dto: { message?: string }
  ) {
    const tenant = await this.tenantsService.findOne(tenantId);

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    // Check building access
    const hasAccess = await this.permissionsService.canViewBuilding(
      user,
      tenant.buildingId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this building");
    }

    return this.tenantsService.sendCOIReminder(tenantId, dto.message);
  }
}
