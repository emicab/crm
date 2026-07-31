-- supabase_migration.sql
-- Migración segura: crea tablas faltantes y agrega columnas sin dropear nada.
-- Ejecutar en el editor SQL de Supabase.

-- 1. StoreConfig (si no existe)
CREATE TABLE IF NOT EXISTS "StoreConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "isWebActive" BOOLEAN DEFAULT FALSE,
    "mpAccessToken" TEXT,
    "mpPublicKey" TEXT,
    "mpFeePercent" NUMERIC(12, 2) DEFAULT 0,
    "whatsappPhone" TEXT,
    "minStockBuffer" DOUBLE PRECISION DEFAULT 0,
    "allowPickup" BOOLEAN DEFAULT TRUE,
    "allowDelivery" BOOLEAN DEFAULT TRUE,
    "deliveryFee" NUMERIC(12, 2) DEFAULT 0,
    "minDeliveryAmount" NUMERIC(12, 2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id")
);

-- 2. WebOrder (si no existe)
CREATE TABLE IF NOT EXISTS "WebOrder" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "webOrderNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT NOT NULL,
    "shippingAddress" TEXT,
    "deliveryType" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PREPARATION',
    "totalAmount" NUMERIC(12, 2) NOT NULL,
    "mpFeeAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 3. WebOrderItem (si no existe)
CREATE TABLE IF NOT EXISTS "WebOrderItem" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "webOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" NUMERIC(12, 2) NOT NULL,
    "subtotal" NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "webOrderId") REFERENCES "WebOrder" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "productId") REFERENCES "Product" ("tenant_id", "id") ON DELETE CASCADE
);

-- 4. Agregar columna mpFeeAmount a WebOrder si la tabla ya existía sin ella
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'WebOrder'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'WebOrder' AND column_name = 'mpFeeAmount'
        ) THEN
            ALTER TABLE "WebOrder" ADD COLUMN "mpFeeAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 5. Agregar columnas faltantes a StoreConfig si la tabla ya existía sin ellas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StoreConfig') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'id') THEN
            ALTER TABLE "StoreConfig" ADD COLUMN "id" INTEGER NOT NULL DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'mpAccessToken') THEN
            ALTER TABLE "StoreConfig" ADD COLUMN "mpAccessToken" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'mpPublicKey') THEN
            ALTER TABLE "StoreConfig" ADD COLUMN "mpPublicKey" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'mpFeePercent') THEN
            ALTER TABLE "StoreConfig" ADD COLUMN "mpFeePercent" NUMERIC(12, 2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'minDeliveryAmount') THEN
            ALTER TABLE "StoreConfig" ADD COLUMN "minDeliveryAmount" NUMERIC(12, 2) DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 6. Deshabilitar RLS para las tablas nuevas (idempotente)
ALTER TABLE IF EXISTS "StoreConfig" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "WebOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "WebOrderItem" DISABLE ROW LEVEL SECURITY;
