-- 20260812_integrations_audit.sql
-- Ejecutar en el SQL Editor de Supabase.
-- 1) Webhook secret de Rappi (paridad con peyaWebhookSecret).
-- 2) Columnas de integración que faltan en WebOrder/WebOrderItem (nunca se
--    habían creado en la nube): el POS las sincroniza con toWebOrderPayload.
-- 3) Índice único parcial sobre externalOrderId: impide pedidos duplicados por
--    reintentos concurrentes de los webhooks (PeYA reintenta hasta 5 veces).

ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "rappiWebhookSecret" TEXT;

ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "orderCode" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "chainId" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "transportType" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "promisedFor" TIMESTAMPTZ;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "acceptedFor" TIMESTAMPTZ;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "riderInfo" TEXT;

ALTER TABLE "WebOrderItem" ADD COLUMN IF NOT EXISTS "externalItemId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WebOrder_externalOrderId_key"
  ON "WebOrder" ("externalOrderId")
  WHERE "externalOrderId" IS NOT NULL;
