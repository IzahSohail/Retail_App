/*
  Warnings:

  - You are about to drop the column `discountMinor` on the `sales` table. All the data in the column will be lost.
  - Added the required column `sellerId` to the `products` table without a default value. This is not possible if the table is not empty.

*/

-- First add the sellerId column as nullable
ALTER TABLE "public"."products" ADD COLUMN "sellerId" TEXT;

-- Update all existing products to use the dummy seller
UPDATE "public"."products" SET "sellerId" = 'sampleseller';

-- Now make the column NOT NULL
ALTER TABLE "public"."products" ALTER COLUMN "sellerId" SET NOT NULL;

-- AlterTable: Remove discount from sales
ALTER TABLE "public"."sales" DROP COLUMN "discountMinor";

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "public"."products"("sellerId");

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
