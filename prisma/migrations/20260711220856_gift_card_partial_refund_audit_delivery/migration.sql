-- AlterTable
ALTER TABLE "GiftCard" ALTER COLUMN "delivered" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundedAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "GiftCardAuditLog" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "reason" TEXT,
    "adminEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftCardAuditLog_giftCardId_idx" ON "GiftCardAuditLog"("giftCardId");

-- AddForeignKey
ALTER TABLE "GiftCardAuditLog" ADD CONSTRAINT "GiftCardAuditLog_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
