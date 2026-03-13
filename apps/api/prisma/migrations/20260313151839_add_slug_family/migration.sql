/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `families` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "families" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "families_slug_key" ON "families"("slug");
