-- ============================================================
-- LIMPIEZA DE DATOS POR TENANT (excepto StoreConfig y Setting)
-- ============================================================
-- Borra TODOS los datos de los tenants:
--   'dd18730d7698fe24' y 'a95d7851095fe702'
-- conservando StoreConfig y Setting (configuracion de la tienda web).
--
-- Ejecutar en el SQL Editor de Supabase (rol postgres / dashboard).
--
-- POR QUE ASI:
--  Varias FK compuestas incluyen tenant_id NOT NULL con ON DELETE SET NULL
--  (ej. Sale.cashRegisterId, SaleItem.productId, Product.supplierId). Borrar
--  un padre con hijos presentes hace que Postgres intente SET tenant_id=NULL
--  y falle. Por eso se desactivan los triggers de FK dentro de la transaccion
--  (session_replication_role = replica) y se borra en CUALQUIER orden: como se
--  eliminan TODAS las filas de ambos tenants de TODAS las tablas, no quedan
--  huerfanos.
--
-- Idempotente: si se vuelve a ejecutar, no hay nada que borrar.
-- ============================================================

BEGIN;

-- Ignorar las FOREIGN KEY durante esta transaccion (solo afecta a este bloque).
SET LOCAL session_replication_role = replica;

DO $$
DECLARE
  tenants TEXT[] := ARRAY['dd18730d7698fe24', 'a95d7851095fe702'];
  tabla TEXT;
  total BIGINT := 0;
  filas INTEGER;
BEGIN
  FOR tabla IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN ('StoreConfig', 'Setting')
    ORDER BY c.table_name
  LOOP
    EXECUTE format('DELETE FROM %I WHERE tenant_id = ANY($1)', tabla) USING tenants;
    GET DIAGNOSTICS filas = ROW_COUNT;
    IF filas > 0 THEN
      RAISE NOTICE '% filas borradas de %', filas, tabla;
      total := total + filas;
    END IF;
  END LOOP;

  RAISE NOTICE 'Limpieza completada: % filas en total. StoreConfig y Setting NO se tocaron.', total;
END $$;

COMMIT;
