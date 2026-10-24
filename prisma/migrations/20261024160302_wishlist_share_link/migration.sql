-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wishlistShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_wishlistShareToken_key" ON "User"("wishlistShareToken");

