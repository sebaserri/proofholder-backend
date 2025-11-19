-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ACCOUNT_OWNER', 'PORTFOLIO_MANAGER', 'PROPERTY_MANAGER', 'BUILDING_OWNER', 'TENANT', 'VENDOR', 'GUARD');

-- CreateEnum
CREATE TYPE "COIStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VendorAuthStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('ENTRY_GRANTED', 'ENTRY_DENIED');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PWD_RESET');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'UPLOAD_COI', 'REVIEW_COI');

-- CreateEnum
CREATE TYPE "CoiRequestStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BrokerInboxStatus" AS ENUM ('RECEIVED', 'PARSED', 'ATTACHED', 'ERROR');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organizationId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "state" TEXT NOT NULL DEFAULT 'Unknown',
    "zipCode" TEXT NOT NULL DEFAULT '00000',
    "organizationId" TEXT,
    "ownerId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBuildingAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBuildingAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyName" TEXT NOT NULL DEFAULT 'Unknown Company',
    "contactName" TEXT NOT NULL DEFAULT 'Unknown Contact',
    "contactPhone" TEXT,
    "contactEmail" TEXT NOT NULL,
    "serviceType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBuildingAuthorization" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "status" "VendorAuthStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBuildingAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "employeeId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardBuildingAssignment" (
    "id" TEXT NOT NULL,
    "guardId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardBuildingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "COI" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "tenantId" TEXT,
    "buildingId" TEXT NOT NULL,
    "status" "COIStatus" NOT NULL DEFAULT 'PENDING',
    "insuranceCompany" TEXT,
    "policyNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "coverageType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverageAmounts" JSONB,
    "glOccurrence" DOUBLE PRECISION,
    "glAggregate" DOUBLE PRECISION,
    "glProductsOps" DOUBLE PRECISION,
    "glPersonalAdv" DOUBLE PRECISION,
    "glMedicalExp" DOUBLE PRECISION,
    "glDamageRented" DOUBLE PRECISION,
    "autoBodyInjury" DOUBLE PRECISION,
    "autoPropDamage" DOUBLE PRECISION,
    "autoCombined" DOUBLE PRECISION,
    "umbrellaLimit" DOUBLE PRECISION,
    "umbrellaRetention" DOUBLE PRECISION,
    "wcPerAccident" DOUBLE PRECISION,
    "wcPerEmployee" DOUBLE PRECISION,
    "wcPolicyLimit" DOUBLE PRECISION,
    "additionalInsured" BOOLEAN DEFAULT false,
    "waiverSubrogation" BOOLEAN NOT NULL DEFAULT false,
    "primaryNonContrib" BOOLEAN NOT NULL DEFAULT false,
    "noticeOfCancel" INTEGER,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "COI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "COIFile" (
    "id" TEXT NOT NULL,
    "coiId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT 'unknown.pdf',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "COIFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementTemplate" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Requirements',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "glRequired" BOOLEAN NOT NULL DEFAULT true,
    "glMinOccurrence" DOUBLE PRECISION DEFAULT 1000000,
    "glMinAggregate" DOUBLE PRECISION DEFAULT 2000000,
    "autoRequired" BOOLEAN NOT NULL DEFAULT false,
    "autoMinCombined" DOUBLE PRECISION DEFAULT 1000000,
    "umbrellaRequired" BOOLEAN NOT NULL DEFAULT false,
    "umbrellaMinLimit" DOUBLE PRECISION DEFAULT 5000000,
    "wcRequired" BOOLEAN NOT NULL DEFAULT false,
    "additionalInsuredRequired" BOOLEAN NOT NULL DEFAULT true,
    "waiverSubrogationRequired" BOOLEAN NOT NULL DEFAULT false,
    "primaryNonContribRequired" BOOLEAN NOT NULL DEFAULT false,
    "noticeOfCancelMin" INTEGER DEFAULT 30,
    "holderName" TEXT,
    "holderAddress" TEXT,
    "additionalInsuredText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoiRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "guardId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "action" "AccessStatus" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL DEFAULT '',
    "subject" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingIntegration" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "integrationType" TEXT NOT NULL DEFAULT 'webhook',
    "webhookUrl" TEXT,
    "apiKey" TEXT,
    "config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInbox" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'unknown',
    "subject" TEXT,
    "body" TEXT,
    "attachments" JSONB,
    "status" "BrokerInboxStatus" NOT NULL DEFAULT 'RECEIVED',
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerInbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");

-- CreateIndex
CREATE INDEX "Building_ownerId_idx" ON "Building"("ownerId");

-- CreateIndex
CREATE INDEX "UserBuildingAccess_buildingId_idx" ON "UserBuildingAccess"("buildingId");

-- CreateIndex
CREATE INDEX "UserBuildingAccess_userId_idx" ON "UserBuildingAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBuildingAccess_userId_buildingId_key" ON "UserBuildingAccess"("userId", "buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_userId_key" ON "Vendor"("userId");

-- CreateIndex
CREATE INDEX "Vendor_userId_idx" ON "Vendor"("userId");

-- CreateIndex
CREATE INDEX "Vendor_companyName_idx" ON "Vendor"("companyName");

-- CreateIndex
CREATE INDEX "VendorBuildingAuthorization_buildingId_status_idx" ON "VendorBuildingAuthorization"("buildingId", "status");

-- CreateIndex
CREATE INDEX "VendorBuildingAuthorization_vendorId_idx" ON "VendorBuildingAuthorization"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBuildingAuthorization_vendorId_buildingId_key" ON "VendorBuildingAuthorization"("vendorId", "buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "Tenant_buildingId_idx" ON "Tenant"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guard_userId_key" ON "Guard"("userId");

-- CreateIndex
CREATE INDEX "Guard_userId_idx" ON "Guard"("userId");

-- CreateIndex
CREATE INDEX "Guard_employeeId_idx" ON "Guard"("employeeId");

-- CreateIndex
CREATE INDEX "GuardBuildingAssignment_buildingId_idx" ON "GuardBuildingAssignment"("buildingId");

-- CreateIndex
CREATE INDEX "GuardBuildingAssignment_guardId_idx" ON "GuardBuildingAssignment"("guardId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardBuildingAssignment_guardId_buildingId_key" ON "GuardBuildingAssignment"("guardId", "buildingId");

-- CreateIndex
CREATE INDEX "COI_vendorId_idx" ON "COI"("vendorId");

-- CreateIndex
CREATE INDEX "COI_tenantId_idx" ON "COI"("tenantId");

-- CreateIndex
CREATE INDEX "COI_buildingId_idx" ON "COI"("buildingId");

-- CreateIndex
CREATE INDEX "COI_status_idx" ON "COI"("status");

-- CreateIndex
CREATE INDEX "COI_expirationDate_idx" ON "COI"("expirationDate");

-- CreateIndex
CREATE INDEX "COIFile_coiId_idx" ON "COIFile"("coiId");

-- CreateIndex
CREATE INDEX "RequirementTemplate_buildingId_idx" ON "RequirementTemplate"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementTemplate_buildingId_active_key" ON "RequirementTemplate"("buildingId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_token_key" ON "AuthToken"("token");

-- CreateIndex
CREATE INDEX "AuthToken_token_idx" ON "AuthToken"("token");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CoiRequest_token_key" ON "CoiRequest"("token");

-- CreateIndex
CREATE INDEX "CoiRequest_token_idx" ON "CoiRequest"("token");

-- CreateIndex
CREATE INDEX "CoiRequest_vendorId_idx" ON "CoiRequest"("vendorId");

-- CreateIndex
CREATE INDEX "CoiRequest_buildingId_idx" ON "CoiRequest"("buildingId");

-- CreateIndex
CREATE INDEX "AccessLog_guardId_idx" ON "AccessLog"("guardId");

-- CreateIndex
CREATE INDEX "AccessLog_vendorId_idx" ON "AccessLog"("vendorId");

-- CreateIndex
CREATE INDEX "AccessLog_buildingId_idx" ON "AccessLog"("buildingId");

-- CreateIndex
CREATE INDEX "AccessLog_timestamp_idx" ON "AccessLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "BuildingIntegration_buildingId_idx" ON "BuildingIntegration"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingIntegration_buildingId_integrationType_key" ON "BuildingIntegration"("buildingId", "integrationType");

-- CreateIndex
CREATE INDEX "BrokerInbox_status_idx" ON "BrokerInbox"("status");

-- CreateIndex
CREATE INDEX "BrokerInbox_sender_idx" ON "BrokerInbox"("sender");

-- CreateIndex
CREATE INDEX "BrokerInbox_createdAt_idx" ON "BrokerInbox"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBuildingAccess" ADD CONSTRAINT "UserBuildingAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBuildingAccess" ADD CONSTRAINT "UserBuildingAccess_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBuildingAccess" ADD CONSTRAINT "UserBuildingAccess_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBuildingAuthorization" ADD CONSTRAINT "VendorBuildingAuthorization_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBuildingAuthorization" ADD CONSTRAINT "VendorBuildingAuthorization_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBuildingAuthorization" ADD CONSTRAINT "VendorBuildingAuthorization_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBuildingAuthorization" ADD CONSTRAINT "VendorBuildingAuthorization_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guard" ADD CONSTRAINT "Guard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guard" ADD CONSTRAINT "Guard_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardBuildingAssignment" ADD CONSTRAINT "GuardBuildingAssignment_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "Guard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardBuildingAssignment" ADD CONSTRAINT "GuardBuildingAssignment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardBuildingAssignment" ADD CONSTRAINT "GuardBuildingAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COI" ADD CONSTRAINT "COI_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COI" ADD CONSTRAINT "COI_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COI" ADD CONSTRAINT "COI_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COI" ADD CONSTRAINT "COI_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COI" ADD CONSTRAINT "COI_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COIFile" ADD CONSTRAINT "COIFile_coiId_fkey" FOREIGN KEY ("coiId") REFERENCES "COI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTemplate" ADD CONSTRAINT "RequirementTemplate_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiRequest" ADD CONSTRAINT "CoiRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiRequest" ADD CONSTRAINT "CoiRequest_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiRequest" ADD CONSTRAINT "CoiRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "Guard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingIntegration" ADD CONSTRAINT "BuildingIntegration_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
