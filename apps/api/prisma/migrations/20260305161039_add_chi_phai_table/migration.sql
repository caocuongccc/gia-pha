-- AlterTable
ALTER TABLE "members" ADD COLUMN     "chiId" TEXT,
ADD COLUMN     "phaiId" TEXT;

-- CreateTable
CREATE TABLE "chi" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "founderNote" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phai" (
    "id" TEXT NOT NULL,
    "chiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "founderNote" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chi_familyId_name_key" ON "chi"("familyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "phai_chiId_name_key" ON "phai"("chiId", "name");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_chiId_fkey" FOREIGN KEY ("chiId") REFERENCES "chi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_phaiId_fkey" FOREIGN KEY ("phaiId") REFERENCES "phai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi" ADD CONSTRAINT "chi_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phai" ADD CONSTRAINT "phai_chiId_fkey" FOREIGN KEY ("chiId") REFERENCES "chi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
