-- 20260812_peya_cloud_binding.sql
-- Ejecutar en el SQL Editor de Supabase.
-- Columnas de vinculación PeYA en StoreConfig (el POS las sube con el sync y
-- clinstore las usa para resolver el tenant del webhook y autorizar proxies).
-- Incluye la creación de peyaWebhookSecret/rappiWebhookSecret (autosuficiente:
-- no depende de que una migración previa se haya aplicado).

ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaWebhookSecret" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "rappiWebhookSecret" TEXT;

-- peyaEnabled faltaba en la nube (el schema local la tiene desde el inicio).
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- Columnas de Product que el sync/el webhook usan y que nunca se crearon en
-- la nube: externalSku (SKU sincronizado con PeYA/Rappi), lastSyncJobId y
-- webUnavailable (agotado para la tienda web).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalSku" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastSyncJobId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "webUnavailable" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaChainId" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaVendorId" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaEnv" TEXT DEFAULT 'SANDBOX';
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaAutoAccept" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaConnected" BOOLEAN NOT NULL DEFAULT FALSE;

-- Los secrets de webhook no deben ser legibles por anon/authenticated
-- (igual que mpAccessToken).
REVOKE SELECT ("peyaWebhookSecret") ON "StoreConfig" FROM anon, authenticated;
GRANT SELECT ("peyaWebhookSecret") ON "StoreConfig" TO service_role;
