/*
  Warnings:

  - You are about to drop the `FundRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScholarshipRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "members" ADD COLUMN     "birthPlace" TEXT;

-- DropTable
DROP TABLE "FundRecord";

-- DropTable
DROP TABLE "ScholarshipRecord";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_records" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "studentName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "school" TEXT,
    "grade" TEXT,
    "achievement" TEXT NOT NULL,
    "rewardAmount" INTEGER,
    "awardedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarship_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_records" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "type" "FundRecordType" NOT NULL,
    "year" INTEGER NOT NULL,
    "eventName" TEXT,
    "contributorName" TEXT,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "scholarship_records" ADD CONSTRAINT "scholarship_records_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_records" ADD CONSTRAINT "scholarship_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_records" ADD CONSTRAINT "fund_records_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_records" ADD CONSTRAINT "fund_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
