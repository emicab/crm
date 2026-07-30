CREATE TABLE "StoreConfig" (
  "id" INTEGER NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "bannerUrl" TEXT,
  "primaryColor" TEXT DEFAULT '#2563eb',
  "isWebActive" BOOLEAN NOT NULL DEFAULT false,
  "mpAccessToken" TEXT,
  "mpPublicKey" TEXT,
  "mpFeePercent" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "whatsappPhone" TEXT,
  "minStockBuffer" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "allowPickup" BOOLEAN NOT NULL DEFAULT true,
  "allowDelivery" BOOLEAN NOT NULL DEFAULT true,
  "deliveryFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "minDeliveryAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreConfig_pkey" PRIMARY KEY ("tenant_id", "id")
);

ALTER TABLE "StoreConfig" DISABLE ROW LEVEL SECURITY;

CREATE TABLE "DiscountCode" (
  "id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" TEXT NOT NULL,
  "discountValue" DECIMAL(10, 2) NOT NULL,
  "minPurchase" DECIMAL(10, 2),
  "maxUses" INTEGER,
  "currentUses" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenant_id" TEXT NOT NULL,
  CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("tenant_id", "id")
);

ALTER TABLE "DiscountCode" DISABLE ROW LEVEL SECURITY;
