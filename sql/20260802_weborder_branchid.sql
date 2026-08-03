-- Migración: WebOrder.branchId (sucursal que despacha/prepara el pedido web)
-- Permite descontar stock de la sucursal elegida en lugar de la principal.
-- PICKUP: lo elige el cliente. DELIVERY: lo asigna el local al preparar (null = sin asignar).
ALTER TABLE "WebOrder"
  ADD COLUMN IF NOT EXISTS "branchId" INTEGER;

CREATE INDEX IF NOT EXISTS "WebOrder_branchId_idx"
  ON "WebOrder" ("tenant_id", "branchId");
