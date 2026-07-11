/*
  Warnings:

  - You are about to drop the column `giftCardAmountApplied` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `giftCardId` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_giftCardId_fkey";

-- DropIndex
DROP INDEX "Order_giftCardId_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "giftCardAmountApplied",
DROP COLUMN "giftCardId";

-- CreateTable
CREATE TABLE "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftCardRedemption_orderId_idx" ON "GiftCardRedemption"("orderId");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_giftCardId_idx" ON "GiftCardRedemption"("giftCardId");

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
