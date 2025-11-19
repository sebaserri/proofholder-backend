import {
  IsEmail,
  MinLength,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { UserRole } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    description: "Marks this registration as coming from an invitation",
  })
  @IsOptional()
  @IsBoolean()
  invited?: boolean;
}
export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @MinLength(6) password: string;
}
export class AuthToken { @ApiProperty() access_token: string; }

export class ForgotPasswordDto {
  @ApiProperty() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() token: string;
  @ApiProperty() password: string;
}

export class VerifyEmailDto {
  @ApiProperty() token: string;
}

export class ResendVerificationDto {
  @ApiProperty() email: string;
}
