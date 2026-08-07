-- Migración: Sincronizar esquema de la nube con Variantes, Modificadores y Rubro Comercial.
-- Aplicar en el SQL Editor de Supabase.

-- 1) StoreConfig: businessSector
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "businessSector" TEXT DEFAULT 'GASTRONOMIA';

-- 2) WebOrder: scheduledFor (programación para la apertura)
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMPTZ;

-- 3) WebOrderItem & SaleItem: modifiers (snapshot JSON de opciones seleccionadas)
ALTER TABLE "WebOrderItem" ADD COLUMN IF NOT EXISTS "modifiers" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "modifiers" TEXT;

-- 4) Tabla ProductModifierGroup
CREATE TABLE IF NOT EXISTS "ProductModifierGroup" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'MULTI_SELECT',
    "isRequired" BOOLEAN DEFAULT FALSE,
    "minSelect" INTEGER DEFAULT 0,
    "maxSelect" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "tenant_id" TEXT
);

CREATE INDEX IF NOT EXISTS "ProductModifierGroup_productId_idx" ON "ProductModifierGroup"("productId");
CREATE INDEX IF NOT EXISTS "ProductModifierGroup_tenant_idx" ON "ProductModifierGroup"("tenant_id");

-- 5) Tabla ProductModifierOption
CREATE TABLE IF NOT EXISTS "ProductModifierOption" (
    "id" SERIAL PRIMARY KEY,
    "modifierGroupId" INTEGER NOT NULL REFERENCES "ProductModifierGroup"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "priceExtra" NUMERIC DEFAULT 0,
    "colorHex" TEXT,
    "ingredientId" INTEGER,
    "ingredientQty" NUMERIC DEFAULT 1,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "tenant_id" TEXT
);

ALTER TABLE "ProductModifierOption" ADD COLUMN IF NOT EXISTS "ingredientQty" NUMERIC DEFAULT 1;

CREATE INDEX IF NOT EXISTS "ProductModifierOption_modifierGroupId_idx" ON "ProductModifierOption"("modifierGroupId");
CREATE INDEX IF NOT EXISTS "ProductModifierOption_tenant_idx" ON "ProductModifierOption"("tenant_id");

-- Desactivar RLS para sincronización directa
ALTER TABLE "ProductModifierGroup" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductModifierOption" DISABLE ROW LEVEL SECURITY;
