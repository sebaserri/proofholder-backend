import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class InviteUserDto {
  @ApiProperty({ description: "Email of the user to invite" })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Role to invite the user as",
    enum: [
      UserRole.PORTFOLIO_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.BUILDING_OWNER,
      UserRole.GUARD,
      UserRole.VENDOR,
    ],
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: "First name of the invitee" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: "Last name of the invitee" })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class UserListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    description: "Last time the user logged in",
  })
  lastLoginAt?: Date | null;

  @ApiPropertyOptional({
    description: "Whether there is a pending invitation for this email",
  })
  invited?: boolean;
}

export class UserInvitationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional()
  invitedAt?: Date;

  @ApiPropertyOptional()
  invitedByName?: string | null;
}
