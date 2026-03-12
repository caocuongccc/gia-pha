-- AlterTable
ALTER TABLE "post_photos" ADD COLUMN     "driveFileId" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "albumDate" TIMESTAMP(3),
ADD COLUMN     "albumLocation" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleDriveFolderId" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiry" TIMESTAMP(3);
