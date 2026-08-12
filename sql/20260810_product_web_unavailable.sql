-- 20260810_product_web_unavailable.sql
-- Ejecutar este script en el SQL Editor de Supabase.
-- Flag manual del comerciante: marca un producto como "agotado / no disponible"
-- en la tienda web (ClinStore). A diferencia del stock, es una decisión explícita
-- del local: la tienda muestra el badge "Agotado" y bloquea la compra.
-- El stock ya no se muestra como cantidad ni se usa para badge automático.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "webUnavailable" BOOLEAN DEFAULT FALSE;
