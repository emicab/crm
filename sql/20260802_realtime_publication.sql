-- Migración: Habilitar Realtime para las tablas que escuchan el POS y ClinStore.
-- Sin esto, los canales 'postgres_changes' (POS en Layout.tsx y tienda en
-- useStoreData.ts) nunca reciben eventos y todo depende del fallback de 5 min.
DO $$
DECLARE
  t TEXT;
  pub_exists BOOLEAN;
  tables_to_add TEXT[] := ARRAY[
    'Product',
    'ProductBranchStock',
    'Sale',
    'Purchase',
    'StockTransfer',
    'WebOrder',
    'WebOrderItem',
    'StoreConfig'
  ];
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;

  IF NOT pub_exists THEN
    RAISE NOTICE 'No existe la publicación supabase_realtime; omitiendo (crearla en el dashboard de Supabase).';
    RETURN;
  END IF;

  FOREACH t IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
