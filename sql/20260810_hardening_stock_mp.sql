-- 20260810_hardening_stock_mp.sql
-- Endurecimiento de seguridad para la tienda web (ClinStore).
-- Ejecutar en el SQL Editor de Supabase.
--
-- 1) Revoca a anon/authenticated la ejecución de las RPC de decremento de
--    stock. Antes cualquier persona con la anon key (expuesta en el bundle)
--    podía quemar stock de cualquier tenant. Las rutas del servidor ya usan
--    service_role (supabaseAdmin), que conserva el acceso.
-- 2) Oculta mpAccessToken de anon/authenticated a nivel de columna: antes el
--    navegador podía leer el token de Mercado Pago de TODAS las tiendas.
-- 3) RPC increment_stock / increment_recipe_stock (solo service_role) para
--    liberar stock cuando un pedido pendiente expira o se cancela.
-- 4) Columnas nuevas en WebOrder: clientIp (auditoría anti-fraude) y
--    stockReleased (marca para la expiración idempotente).

REVOKE EXECUTE ON FUNCTION decrement_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION decrement_recipe_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION decrement_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION decrement_recipe_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION decrement_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION decrement_recipe_stock(TEXT, INTEGER, NUMERIC, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock(TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_recipe_stock(TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;

-- 2) Ocultar el token de Mercado Pago de los roles públicos.
REVOKE SELECT ("mpAccessToken") ON "StoreConfig" FROM anon, authenticated;
GRANT SELECT ("mpAccessToken") ON "StoreConfig" TO service_role;

-- 3) RPC de incremento de stock (restaurar stock reservado).
CREATE OR REPLACE FUNCTION increment_stock(
    p_tenant_id TEXT,
    p_product_id INTEGER,
    p_qty NUMERIC,
    p_branch_id INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "Product"
    SET "quantityStock" = "quantityStock" + p_qty, "updatedAt" = NOW()
    WHERE "tenant_id" = p_tenant_id AND "id" = p_product_id;
    IF p_branch_id IS NOT NULL THEN
        UPDATE "ProductBranchStock"
        SET "quantityStock" = "quantityStock" + p_qty, "updatedAt" = NOW()
        WHERE "tenant_id" = p_tenant_id
          AND "productId" = p_product_id
          AND "branchId" = p_branch_id;
    END IF;
    RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION increment_recipe_stock(
    p_tenant_id TEXT,
    p_product_id INTEGER,
    p_qty NUMERIC,
    p_branch_id INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    _leaf RECORD;
    v_needed NUMERIC;
BEGIN
    FOR _leaf IN
        SELECT * FROM (
            WITH RECURSIVE "exp" AS (
                SELECT "ingredientId", "quantity" AS "accQty", 1 AS "depth"
                FROM "RecipeItem"
                WHERE "tenant_id" = p_tenant_id AND "productId" = p_product_id
                UNION ALL
                SELECT r."ingredientId", e."accQty" * r."quantity", e."depth" + 1
                FROM "exp" e
                JOIN "RecipeItem" r
                  ON r."tenant_id" = p_tenant_id AND r."productId" = e."ingredientId"
                WHERE e."depth" < 10
            )
            SELECT "ingredientId", SUM("accQty") AS "needed"
            FROM "exp"
            WHERE "ingredientId" NOT IN (
                SELECT "productId" FROM "RecipeItem" WHERE "tenant_id" = p_tenant_id
            )
            GROUP BY "ingredientId"
        ) "leaves"
    LOOP
        v_needed := _leaf.needed * p_qty;
        UPDATE "Product"
        SET "quantityStock" = "quantityStock" + v_needed, "updatedAt" = NOW()
        WHERE "tenant_id" = p_tenant_id AND "id" = _leaf."ingredientId";
        IF p_branch_id IS NOT NULL THEN
            UPDATE "ProductBranchStock"
            SET "quantityStock" = "quantityStock" + v_needed, "updatedAt" = NOW()
            WHERE "tenant_id" = p_tenant_id
              AND "productId" = _leaf."ingredientId"
              AND "branchId" = p_branch_id;
        END IF;
    END LOOP;
    RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION increment_stock(TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_recipe_stock(TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;

-- 4) Columnas de auditoría y expiración.
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "clientIp" TEXT;
ALTER TABLE "WebOrder" ADD COLUMN IF NOT EXISTS "stockReleased" BOOLEAN NOT NULL DEFAULT FALSE;

-- 5) Toggle del POS: exigir pago confirmado (PAID) antes de preparar pedidos
--    web pagados con Mercado Pago. Por defecto activado.
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "requireMpForDelivery" BOOLEAN NOT NULL DEFAULT TRUE;
