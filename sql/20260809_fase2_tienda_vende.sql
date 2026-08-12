-- 20260809_fase2_tienda_vende.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Fase 2 "tienda que vende": horarios de atención, zonas de envío por radio,
-- ubicación del local y link de seguimiento de pedidos.

-- StoreConfig: ubicación del local (para calcular distancia en zonas de envío)
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;

-- StoreConfig: zonas de envío por anillos. JSON: [{name, fromKm, toKm, fee, minAmount}]
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "deliveryZones" TEXT;

-- StoreConfig: horarios de atención. JSON: [{day, enabled, open, close, breaks:[{start,end}]}]
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "openingHours" TEXT;

-- WebOrder: zona de envío seleccionada al hacer el pedido
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "deliveryZone" TEXT;

-- WebOrder: código corto único para el link público de seguimiento
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "trackingCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WebOrder_trackingCode_key" ON "WebOrder"("trackingCode") WHERE "trackingCode" IS NOT NULL;
