-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "regularPrice" DOUBLE PRECISION NOT NULL,
    "memberPrice" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "externalProductKey" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedScrapeItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "externalProductKey" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "lastSeenPrice" DOUBLE PRECISION NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "UnmatchedScrapeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_householdId_url_key" ON "Store"("householdId", "url");

-- CreateIndex
CREATE INDEX "PriceObservation_productId_storeId_scrapedAt_idx" ON "PriceObservation"("productId", "storeId", "scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_chain_externalProductKey_key" ON "ProductMapping"("chain", "externalProductKey");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedScrapeItem_householdId_chain_externalProductKey_key" ON "UnmatchedScrapeItem"("householdId", "chain", "externalProductKey");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedScrapeItem" ADD CONSTRAINT "UnmatchedScrapeItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
