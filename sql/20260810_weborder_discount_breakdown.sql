-- 20260810_weborder_discount_breakdown.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Guarda el desglose de descuentos (combos, promociones y código) aplicado a un
-- pedido web como JSON: [{kind: COMBO|PROMO|COUPON, name, amount}].
-- Se muestra en la página pública de seguimiento /pedido/ y en el detalle del POS.

ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "discountBreakdown" TEXT;
