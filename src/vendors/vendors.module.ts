import { Module } from "@nestjs/common";
import { CoisModule } from "../cois/cois.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    CoisModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
