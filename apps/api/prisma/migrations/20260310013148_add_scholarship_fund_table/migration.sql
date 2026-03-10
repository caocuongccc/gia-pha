-- CreateEnum
CREATE TYPE "FundRecordType" AS ENUM ('DIEU_DONG', 'CUNG_TIEN', 'CHI');

-- CreateTable
CREATE TABLE "ScholarshipRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "studentName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "school" TEXT,
    "grade" TEXT,
    "achievement" TEXT NOT NULL,
    "rewardAmount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScholarshipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "type" "FundRecordType" NOT NULL,
    "year" INTEGER NOT NULL,
    "contributorName" TEXT,
    "memberId" TEXT,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundRecord_pkey" PRIMARY KEY ("id")
);
