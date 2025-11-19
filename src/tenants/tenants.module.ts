import { Module } from "@nestjs/common";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({ providers: [TenantsService], controllers: [TenantsController] })
export class TenantsModule {}
