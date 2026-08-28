-- peya_test_webhook_setup.sql
-- Setup de tienda de PRUEBA para verificar el webhook PeYA sin credenciales.
-- Ejecutar en el SQL Editor de Supabase.
--
-- Hace 2 cosas:
--   1) Configura la StoreConfig existente con chain/vendor/secret de prueba.
--   2) Crea un producto de prueba con SKU conocido y stock (para verificar
--      que el webhook descuenta stock al crear el pedido).

-- 1) StoreConfig de prueba (primer registro del tenant)
UPDATE "StoreConfig"
SET "peyaEnabled" = TRUE,
    "peyaConnected" = TRUE,
    "peyaChainId" = 'chain-test-1234',
    "peyaVendorId" = 'vendor-test-5678',
    "peyaEnv" = 'SANDBOX',
    "peyaWebhookSecret" = 'TEST_WEBHOOK_SECRET_12345',
    "updatedAt" = NOW()
WHERE id = (SELECT id FROM "StoreConfig" ORDER BY id LIMIT 1);

-- 2) Producto de prueba (SKU = sku del item del payload de test).
--    Se inserta solo si no existe, con el tenant_id de la StoreConfig.
INSERT INTO "Product" ("tenant_id", "name", "sku", "pricePurchase", "priceSale", "quantityStock", "isIngredient", "isPublicWeb", "createdAt", "updatedAt")
SELECT s."tenant_id", 'Producto Test PeYA', 'TEST-PEYA-001', 50, 100, 100, FALSE, FALSE, NOW(), NOW()
FROM "StoreConfig" s
WHERE NOT EXISTS (
  SELECT 1 FROM "Product" p WHERE p."sku" = 'TEST-PEYA-001'
)
LIMIT 1;
