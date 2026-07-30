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
    "isPublicWeb" BOOLEAN DEFAULT TRUE,
    "webCategory" TEXT,
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

-- 22. Tabla StoreConfig (Configuración de Tienda ClinStore)
CREATE TABLE "StoreConfig" (
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
    "whatsappPhone" TEXT,
    "minStockBuffer" DOUBLE PRECISION DEFAULT 0,
    "allowPickup" BOOLEAN DEFAULT TRUE,
    "allowDelivery" BOOLEAN DEFAULT TRUE,
    "deliveryFee" NUMERIC(12, 2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id")
);

-- 23. Tabla WebOrder (Pedidos Web de ClinStore)
CREATE TABLE "WebOrder" (
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
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

-- 24. Tabla WebOrderItem (Detalle de Pedidos Web)
CREATE TABLE "WebOrderItem" (
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

-- 25. Deshabilitar RLS (Row Level Security) para permitir sincronización directa REST desde el POS
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
ALTER TABLE "StoreConfig" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WebOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WebOrderItem" DISABLE ROW LEVEL SECURITY;
C R E A T E   T A B L E   \  
 D i s c o u n t C o d e \   ( 
     \ i d \   I N T E G E R   N O T   N U L L , 
     \ c o d e \   T E X T   N O T   N U L L , 
     \ d i s c o u n t T y p e \   T E X T   N O T   N U L L , 
     \ d i s c o u n t V a l u e \   D E C I M A L ( 1 0 ,   2 )   N O T   N U L L , 
     \ m i n P u r c h a s e \   D E C I M A L ( 1 0 ,   2 ) , 
     \ m a x U s e s \   I N T E G E R , 
     \ c u r r e n t U s e s \   I N T E G E R   N O T   N U L L   D E F A U L T   0 , 
     \ v a l i d F r o m \   T I M E S T A M P ( 3 ) , 
     \ v a l i d U n t i l \   T I M E S T A M P ( 3 ) , 
     \ i s A c t i v e \   B O O L E A N   N O T   N U L L   D E F A U L T   t r u e , 
     \ c r e a t e d A t \   T I M E S T A M P ( 3 )   N O T   N U L L   D E F A U L T   C U R R E N T _ T I M E S T A M P , 
     \ u p d a t e d A t \   T I M E S T A M P ( 3 )   N O T   N U L L , 
     \ t e n a n t _ i d \   T E X T   N O T   N U L L , 
     C O N S T R A I N T   \ D i s c o u n t C o d e _ p k e y \   P R I M A R Y   K E Y   ( \ t e n a n t _ i d \ ,   \ i d \ ) 
 ) ; 
 A L T E R   T A B L E   \ D i s c o u n t C o d e \   D I S A B L E   R O W   L E V E L   S E C U R I T Y ;  
 