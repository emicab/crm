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
    "branchId" INTEGER,
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

-- 6b. Agregar columna branchId a WebOrder (sucursal que despacha/prepara)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'WebOrder' AND column_name = 'branchId') THEN
        ALTER TABLE "WebOrder" ADD COLUMN "branchId" INTEGER;
    END IF;
END $$;

-- 7. Agregar columna imageUrl a Product, Combo y Promotion (para reflejar imágenes en la tienda)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Combo' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Combo" ADD COLUMN "imageUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Promotion' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Promotion" ADD COLUMN "imageUrl" TEXT;
    END IF;
END $$;

-- 8. Agregar columna customDomain a StoreConfig (dominio personalizado de la tienda, ej. clinstore.com.ar)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StoreConfig' AND column_name = 'customDomain') THEN
        ALTER TABLE "StoreConfig" ADD COLUMN "customDomain" TEXT;
    END IF;
END $$;

-- 9. Agregar columnas items (Combo) y conditions (Promotion) como JSONB para que la
--    tienda web lea el contenido de combos y las condiciones de promociones sin joins.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Combo' AND column_name = 'items') THEN
        ALTER TABLE "Combo" ADD COLUMN "items" JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Promotion' AND column_name = 'conditions') THEN
        ALTER TABLE "Promotion" ADD COLUMN "conditions" JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 10. SaleItem: permitir desvincular el producto (productId nullable) y guardar
--     el nombre del producto (productName) para conservar el historial al borrar.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SaleItem' AND column_name = 'productName') THEN
        ALTER TABLE "SaleItem" ADD COLUMN "productName" TEXT;
    END IF;
END $$;
DO $$
BEGIN
    -- Backfill del nombre desde el producto (solo si hay columnas)
    UPDATE "SaleItem" si
    SET "productName" = p."name"
    FROM "Product" p
    WHERE si."productId" = p."id" AND si."productName" IS NULL;
END $$;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SaleItem' AND column_name = 'productId' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "SaleItem" ALTER COLUMN "productId" DROP NOT NULL;
    END IF;
END $$;

-- 11. Margen de stock mínimo por defecto = 1 (respaldo: la tienda nunca vende la
--     última unidad del local si el usuario no configura el margen).
DO $$
BEGIN
    UPDATE "StoreConfig" SET "minStockBuffer" = 1 WHERE "minStockBuffer" IS NULL OR "minStockBuffer" = 0;
END $$;

-- 12. RPC atómica de decremento de stock. Garantiza que ante dos pedidos web
--     simultáneos por el mismo producto, solo uno descuente el stock (el otro
--     recibe FALSE y el pedido se rechaza). Elimina la race condition por 1 unidad.
CREATE OR REPLACE FUNCTION decrement_stock(
    p_tenant_id TEXT,
    p_product_id INTEGER,
    p_qty NUMERIC,
    p_branch_id INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE ok INTEGER;
BEGIN
    UPDATE "Product"
    SET "quantityStock" = "quantityStock" - p_qty, "updatedAt" = NOW()
    WHERE "tenant_id" = p_tenant_id AND "id" = p_product_id AND "quantityStock" >= p_qty;
    GET DIAGNOSTICS ok = ROW_COUNT;
    IF ok = 0 THEN
        RETURN FALSE;
    END IF;

    IF p_branch_id IS NOT NULL THEN
        UPDATE "ProductBranchStock"
        SET "quantityStock" = "quantityStock" - p_qty, "updatedAt" = NOW()
        WHERE "tenant_id" = p_tenant_id
          AND "productId" = p_product_id
          AND "branchId" = p_branch_id;
    END IF;

    RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION decrement_stock(TEXT, INTEGER, NUMERIC, INTEGER) TO anon, authenticated;
