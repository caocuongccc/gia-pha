/*
  Warnings:

  - You are about to drop the column `googleAccessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleDriveFolderId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleRefreshToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleTokenExpiry` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleDriveFolderId",
DROP COLUMN "googleRefreshToken",
DROP COLUMN "googleTokenExpiry";

-- CreateTable
CREATE TABLE "family_drive_accounts" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "connectedBy" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "folderId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_drive_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_drive_permissions" (
    "id" TEXT NOT NULL,
    "driveAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_drive_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_drive_accounts_familyId_key" ON "family_drive_accounts"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "family_drive_permissions_driveAccountId_userId_key" ON "family_drive_permissions"("driveAccountId", "userId");

-- AddForeignKey
ALTER TABLE "family_drive_accounts" ADD CONSTRAINT "family_drive_accounts_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_drive_accounts" ADD CONSTRAINT "family_drive_accounts_connectedBy_fkey" FOREIGN KEY ("connectedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_drive_permissions" ADD CONSTRAINT "family_drive_permissions_driveAccountId_fkey" FOREIGN KEY ("driveAccountId") REFERENCES "family_drive_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_drive_permissions" ADD CONSTRAINT "family_drive_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_drive_permissions" ADD CONSTRAINT "family_drive_permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
