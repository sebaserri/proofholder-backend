import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserRole } from "@prisma/client";

export interface JwtUser {
  id: string;
  role: UserRole;
  organizationId?: string | null;
  vendorId?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
