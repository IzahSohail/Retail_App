-- CreateTable
CREATE TABLE "public"."defective_items" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,

    CONSTRAINT "defective_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defective_items_returnRequestId_idx" ON "public"."defective_items"("returnRequestId");

-- CreateIndex
CREATE INDEX "defective_items_productId_idx" ON "public"."defective_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "defective_items_returnRequestId_productId_key" ON "public"."defective_items"("returnRequestId", "productId");

-- AddForeignKey
ALTER TABLE "public"."defective_items" ADD CONSTRAINT "defective_items_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "public"."return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."defective_items" ADD CONSTRAINT "defective_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
