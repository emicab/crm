-- 20260812_app_state_cron.sql
-- Estado de metadatos del backend (ClinStore) para coordinar tareas de fondo
-- distribuidas: expiración de pedidos pendientes (lazy cron en la nube + cron
-- distribuido desde el POS cada 5 min).
--
-- AppState NO es sincronizada por el POS (a diferencia de Setting, que sufre
-- push/pull en cada sync). Vive solo en la nube y solo service_role puede
-- leer/escribir, igual que el resto del hardening ya aplicado.

CREATE TABLE IF NOT EXISTS "AppState" (
  "tenant_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("tenant_id", "key")
);

REVOKE ALL ON "AppState" FROM anon, authenticated;
GRANT ALL ON "AppState" TO service_role;
