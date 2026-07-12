-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "disputeDueBy" TIMESTAMP(3),
ADD COLUMN     "disputeId" TEXT,
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeStatus" TEXT;

-- CreateTable
CREATE TABLE "GiftCardHold" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GiftCardHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftCardHold_giftCardId_idx" ON "GiftCardHold"("giftCardId");

-- CreateIndex
CREATE INDEX "GiftCardHold_paymentIntentId_idx" ON "GiftCardHold"("paymentIntentId");

-- CreateIndex
CREATE INDEX "GiftCardHold_status_createdAt_idx" ON "GiftCardHold"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "GiftCardHold" ADD CONSTRAINT "GiftCardHold_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
