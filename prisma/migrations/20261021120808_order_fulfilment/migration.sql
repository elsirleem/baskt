-- CreateEnum
CREATE TYPE "FulfilmentStatus" AS ENUM ('UNFULFILLED', 'PACKED', 'SHIPPED', 'DELIVERED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "fulfilment" "FulfilmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- CreateIndex
CREATE INDEX "Order_status_fulfilment_createdAt_idx" ON "Order"("status", "fulfilment", "createdAt");
