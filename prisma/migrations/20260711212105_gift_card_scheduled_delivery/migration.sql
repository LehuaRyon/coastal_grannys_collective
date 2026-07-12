-- AlterTable
ALTER TABLE "GiftCard" ADD COLUMN     "deliverOn" TIMESTAMP(3),
ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "giftDeliverOn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "GiftCard_delivered_deliverOn_idx" ON "GiftCard"("delivered", "deliverOn");
