-- supabase_schema.sql
-- Ejecute este script en el editor SQL de Supabase para limpiar y crear la base de datos multi-inquilino (multi-tenant).
-- NOTA: Las claves primarias y relaciones son compuestas, formadas por (tenant_id, id).

-- 0. Limpiar tablas existentes en orden de dependencia
DROP TABLE IF EXISTS "AccountMovement" CASCADE;
DROP TABLE IF EXISTS "AccountBalance" CASCADE;
DROP TABLE IF EXISTS "CashMovement" CASCADE;
DROP TABLE IF EXISTS "CashRegister" CASCADE;
DROP TABLE IF EXISTS "ComboItem" CASCADE;
DROP TABLE IF EXISTS "Combo" CASCADE;
DROP TABLE IF EXISTS "SaleItem" CASCADE;
DROP TABLE IF EXISTS "Sale" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Seller" CASCADE;
DROP TABLE IF EXISTS "Client" CASCADE;
DROP TABLE IF EXISTS "Promotion" CASCADE;
DROP TABLE IF EXISTS "DiscountCode" CASCADE;
DROP TABLE IF EXISTS "Supplier" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Brand" CASCADE;
DROP TABLE IF EXISTS "PurchaseItem" CASCADE;
DROP TABLE IF EXISTS "Purchase" CASCADE;
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "Setting" CASCADE;

-- Habilitar extensiones opcionales
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla Brand (Marcas)
CREATE TABLE "Brand" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 2. Tabla Category (Categorías)
CREATE TABLE "Category" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 3. Tabla Supplier (Proveedores)
CREATE TABLE "Supplier" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 4. Tabla DiscountCode (Códigos de Descuento)
CREATE TABLE "DiscountCode" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" NUMERIC(12, 2) NOT NULL,
    "validFrom" TIMESTAMP WITH TIME ZONE,
    "validUntil" TIMESTAMP WITH TIME ZONE,
    "maxUses" INTEGER,
    "currentUses" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 5. Tabla Promotion (Promociones)
CREATE TABLE "Promotion" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ACTIVE',
    "discountType" TEXT NOT NULL,
    "discountValue" NUMERIC(12, 2) NOT NULL,
    "minQuantity" INTEGER,
    "maxDiscountQty" INTEGER,
    "priority" INTEGER DEFAULT 0,
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 6. Tabla Client (Clientes)
CREATE TABLE "Client" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 7. Tabla Seller (Vendedores)
CREATE TABLE "Seller" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 8. Tabla User (Usuarios / PIN)
CREATE TABLE "User" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 9. Tabla Product (Productos)
CREATE TABLE "Product" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "pricePurchase" NUMERIC(12, 2) NOT NULL,
    "priceSale" NUMERIC(12, 2) NOT NULL,
    "quantityStock" DOUBLE PRECISION NOT NULL,
    "stockMinAlert" DOUBLE PRECISION,
    "unitType" TEXT,
    "brandId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "brandId") REFERENCES "Brand" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "categoryId") REFERENCES "Category" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "supplierId") REFERENCES "Supplier" ("tenant_id", "id") ON DELETE SET NULL
);

-- 10. Tabla Combo (Combos)
CREATE TABLE "Combo" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" NUMERIC(12, 2) NOT NULL,
    "active" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 11. Tabla ComboItem (Ítems de Combos)
CREATE TABLE "ComboItem" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "comboId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customPrice" NUMERIC(12, 2),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "comboId") REFERENCES "Combo" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "productId") REFERENCES "Product" ("tenant_id", "id") ON DELETE CASCADE
);

-- 12. Tabla CashRegister (Sesiones de Caja)
CREATE TABLE "CashRegister" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "openDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "closeDate" TIMESTAMP WITH TIME ZONE,
    "initialBalance" NUMERIC(12, 2) NOT NULL,
    "expectedBalance" NUMERIC(12, 2) NOT NULL,
    "actualBalance" NUMERIC(12, 2) NOT NULL,
    "difference" NUMERIC(12, 2) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "sellerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "sellerId") REFERENCES "Seller" ("tenant_id", "id") ON DELETE CASCADE
);

-- 13. Tabla AccountBalance (Saldos Cuenta Corriente)
CREATE TABLE "AccountBalance" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "balance" NUMERIC(12, 2) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "clientId") REFERENCES "Client" ("tenant_id", "id") ON DELETE CASCADE
);

-- 14. Tabla Sale (Ventas)
CREATE TABLE "Sale" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "saleDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "totalAmount" NUMERIC(12, 2) NOT NULL,
    "paymentType" TEXT NOT NULL,
    "notes" TEXT,
    "clientId" INTEGER,
    "sellerId" INTEGER NOT NULL,
    "cashRegisterId" INTEGER,
    "discountCodeApplied" TEXT,
    "promotionsApplied" JSONB,
    "onAccount" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "clientId") REFERENCES "Client" ("tenant_id", "id") ON DELETE SET NULL,
    FOREIGN KEY ("tenant_id", "sellerId") REFERENCES "Seller" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "cashRegisterId") REFERENCES "CashRegister" ("tenant_id", "id") ON DELETE SET NULL
);

-- 15. Tabla SaleItem (Detalle de Ventas)
CREATE TABLE "SaleItem" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceAtSale" NUMERIC(12, 2) NOT NULL,
    "purchasePriceAtSale" NUMERIC(12, 2) NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "saleId") REFERENCES "Sale" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "productId") REFERENCES "Product" ("tenant_id", "id") ON DELETE CASCADE
);

-- 16. Tabla Purchase (Compras)
CREATE TABLE "Purchase" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "totalAmount" NUMERIC(12, 2) NOT NULL,
    "status" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "supplierId") REFERENCES "Supplier" ("tenant_id", "id") ON DELETE SET NULL
);

-- 17. Tabla PurchaseItem (Detalle de Compras)
CREATE TABLE "PurchaseItem" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "purchasePrice" NUMERIC(12, 2) NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "purchaseId") REFERENCES "Purchase" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "productId") REFERENCES "Product" ("tenant_id", "id") ON DELETE CASCADE
);

-- 18. Tabla Expense (Gastos)
CREATE TABLE "Expense" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "expenseDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "category" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 19. Tabla CashMovement (Movimientos de Caja)
CREATE TABLE "CashMovement" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "cashRegisterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "sourceId" INTEGER,
    "amount" NUMERIC(12, 2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "cashRegisterId") REFERENCES "CashRegister" ("tenant_id", "id") ON DELETE CASCADE
);

-- 20. Tabla AccountMovement (Movimientos de CC)
CREATE TABLE "AccountMovement" (
    "tenant_id" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "accountBalanceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "description" TEXT,
    "saleId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id"),
    FOREIGN KEY ("tenant_id", "accountBalanceId") REFERENCES "AccountBalance" ("tenant_id", "id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id", "saleId") REFERENCES "Sale" ("tenant_id", "id") ON DELETE SET NULL
);

-- 21. Tabla Setting (Configuraciones)
CREATE TABLE "Setting" (
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "key")
);

-- 22. Deshabilitar RLS (Row Level Security) para permitir sincronización directa REST desde el POS
ALTER TABLE "Brand" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountCode" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Promotion" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Seller" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Combo" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CashRegister" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountBalance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ComboItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CashMovement" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountMovement" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" DISABLE ROW LEVEL SECURITY;
