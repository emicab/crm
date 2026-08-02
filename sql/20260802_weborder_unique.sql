-- Migración: WebOrder sin duplicados por (tenant_id, webOrderNumber)
-- 1) Limpia duplicados existentes conservando la fila más reciente (mayor id),
--    que suele ser la que quedó PAID (con el pago confirmado).
DELETE FROM "WebOrder" a
USING "WebOrder" b
WHERE   a."tenant_id" = b."tenant_id"
  AND   a."webOrderNumber" = b."webOrderNumber"
  AND   a.id < b.id;

-- 2) Agrega el constraint UNIQUE para impedir duplicados futuros.
--    Reutiliza el delete anterior si el constraint ya existiera (idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS "WebOrder_webOrderNumber_unique"
  ON "WebOrder" ("tenant_id", "webOrderNumber");