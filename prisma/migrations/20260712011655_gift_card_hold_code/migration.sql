/*
  Warnings:

  - Added the required column `code` to the `GiftCardHold` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GiftCardHold" ADD COLUMN     "code" TEXT NOT NULL;
