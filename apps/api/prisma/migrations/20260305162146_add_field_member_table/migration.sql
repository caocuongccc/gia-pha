-- AlterTable
ALTER TABLE "members" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "burialPlace" TEXT,
ADD COLUMN     "childOrder" INTEGER,
ADD COLUMN     "coupleGroupId" TEXT,
ADD COLUMN     "deathYearAm" TEXT,
ADD COLUMN     "isOutPerson" BOOLEAN NOT NULL DEFAULT false;
