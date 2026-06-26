-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "salesRank" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_salesRank_idx" ON "Product"("salesRank");
