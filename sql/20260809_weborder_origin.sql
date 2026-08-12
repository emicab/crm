-- 20260809_weborder_origin.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Agrega la columna origin a WebOrder para distinguir pedidos web de los
-- manuales (WhatsApp, teléfono, presencial, otro).
-- Valores: WEB | WHATSAPP | PHONE | IN_STORE | OTHER

ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "origin" TEXT;
