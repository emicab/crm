-- 20260812_peya_webhook_secret.sql
-- Ejecutar en el SQL Editor de Supabase.
-- Token estático que PedidosYa incluye en el header Authorization de las
-- notificaciones webhook (WebhookKeyAuth). El webhook de PedidosYa lo valida
-- para evitar pedidos falsos.

ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "peyaWebhookSecret" TEXT;
