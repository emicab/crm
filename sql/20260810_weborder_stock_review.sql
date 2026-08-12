-- 20260810_weborder_stock_review.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- WP1 "Regla de Oro": el cliente físico gana la última unidad; el pedido web
-- que no se puede cubrir pasa a estado PENDING_REVIEW (status es TEXT, no
-- requiere migración de enum) y se notifica al POS.
-- Columnas nuevas en WebOrder para el flujo de revisión y devoluciones de MP.

ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "stockReviewNote" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "stockReviewAt" TIMESTAMPTZ;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "mpPaymentId" TEXT;
