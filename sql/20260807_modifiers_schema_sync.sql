-- Migración: Sincronizar esquema de la nube con Variantes, Modificadores y Rubro Comercial.
-- Aplicar en el SQL Editor de Supabase.
--
-- NOTA IMPORTANTE: las tablas de modificadores usan PK COMPUESTA (tenant_id, id),
-- igual que el resto del esquema multi-tenant. El sync del POS usa
-- "Prefer: resolution=merge-duplicates" (on_conflict contra la PK); con una PK
-- simple en "id" los IDs deterministas (productId*1e6 + índice) colisionarían
-- entre tenants distintos y una tienda sobrescribiría los modificadores de otra.

-- 1) StoreConfig: businessSector
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "businessSector" TEXT DEFAULT 'GASTRONOMIA';

-- 2) WebOrder: scheduledFor (programación para la apertura)
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMPTZ;

-- 3) WebOrderItem & SaleItem: modifiers (snapshot JSON de opciones seleccionadas)
ALTER TABLE "WebOrderItem" ADD COLUMN IF NOT EXISTS "modifiers" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "modifiers" TEXT;

-- 4) Tabla ProductModifierGroup (PK compuesta multi-tenant)
CREATE TABLE IF NOT EXISTS "ProductModifierGroup" (
    "tenant_id" TEXT NOT NULL,
    "id" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'MULTI_SELECT',
    "isRequired" BOOLEAN DEFAULT FALSE,
    "minSelect" INTEGER DEFAULT 0,
    "maxSelect" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "productId") REFERENCES "Product" ("tenant_id", "id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductModifierGroup_productId_idx" ON "ProductModifierGroup"("tenant_id", "productId");

-- 5) Tabla ProductModifierOption (PK compuesta multi-tenant)
CREATE TABLE IF NOT EXISTS "ProductModifierOption" (
    "tenant_id" TEXT NOT NULL,
    "id" BIGINT NOT NULL,
    "modifierGroupId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "priceExtra" NUMERIC DEFAULT 0,
    "colorHex" TEXT,
    "ingredientId" BIGINT,
    "ingredientQty" NUMERIC DEFAULT 1,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "modifierGroupId") REFERENCES "ProductModifierGroup" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "ingredientId") REFERENCES "Product" ("tenant_id", "id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ProductModifierOption_modifierGroupId_idx" ON "ProductModifierOption"("tenant_id", "modifierGroupId");

-- Desactivar RLS para sincronización directa (igual que el resto del esquema)
ALTER TABLE "ProductModifierGroup" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductModifierOption" DISABLE ROW LEVEL SECURITY;

-- 6) Realtime: publicar modificadores para que la tienda refleje cambios sin recargar
DO $$
DECLARE
  pub_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;
  IF NOT pub_exists THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ProductModifierGroup'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."ProductModifierGroup";
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ProductModifierOption'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."ProductModifierOption";
  END IF;
END $$;
