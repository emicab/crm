-- multi_branch_schema.sql
-- Ejecute este script en el editor SQL de Supabase para habilitar Multi-Sucursal

CREATE TABLE IF NOT EXISTS "Branch" (
  "tenant_id" TEXT NOT NULL,
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "isMain" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY ("tenant_id", "id")
);

ALTER TABLE "Branch" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "ProductBranchStock" (
  "tenant_id" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "quantityStock" NUMERIC(12, 2) DEFAULT 0,
  "minStock" NUMERIC(12, 2) DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY ("tenant_id", "productId", "branchId")
);

ALTER TABLE "ProductBranchStock" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "StockTransfer" (
  "tenant_id" TEXT NOT NULL,
  "id" INTEGER NOT NULL,
  "sourceBranchId" INTEGER NOT NULL,
  "targetBranchId" INTEGER NOT NULL,
  "status" TEXT DEFAULT 'COMPLETED',
  "notes" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY ("tenant_id", "id")
);

ALTER TABLE "StockTransfer" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "StockTransferItem" (
  "tenant_id" TEXT NOT NULL,
  "transferId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" TEXT,
  "quantity" NUMERIC(12, 2) NOT NULL,
  "receivedQuantity" NUMERIC(12, 2),
  PRIMARY KEY ("tenant_id", "transferId", "productId")
);

ALTER TABLE "StockTransferItem" DISABLE ROW LEVEL SECURITY;

-- Agregar columnas opcionales a Sale, CashRegister y StoreConfig
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "branchId" INTEGER DEFAULT 1;
ALTER TABLE "CashRegister" ADD COLUMN IF NOT EXISTS "branchId" INTEGER DEFAULT 1;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;

-- Traspasos con confirmación de recepción (cantidad recibida por ítem)
ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "receivedQuantity" NUMERIC(12,2);
