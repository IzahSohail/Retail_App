/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_idempotencyKey_key" ON "public"."sales"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sales_idempotencyKey_idx" ON "public"."sales"("idempotencyKey");
