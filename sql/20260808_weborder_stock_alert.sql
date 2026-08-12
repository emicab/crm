-- 20260808_weborder_stock_alert.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Crea la tabla "WebOrderStockAlert" para registrar rechazos de pedidos web por
-- stock insuficiente y notificar al POS (toast urgente).

CREATE TABLE IF NOT EXISTS "WebOrderStockAlert" (
    "tenant_id" TEXT NOT NULL,
    "id" BIGINT NOT NULL,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION,
    "message" TEXT,
    "seenAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("tenant_id", "id")
);

ALTER TABLE "WebOrderStockAlert" DISABLE ROW LEVEL SECURITY;
