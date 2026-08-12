-- 20260808_weborder_discount_fields.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Agrega las columnas de descuento/cupón a la tabla WebOrder para que el POS
-- muestre en el detalle del pedido el código de descuento usado y su importe.

ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "subtotalAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "deliveryFee" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
