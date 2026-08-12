-- sql/cleanup_local_catalog.sql
-- LIMPIA EL CATALOGO LOCAL (prisma/crm_template.db) PARA EMPEZAR DE CERO.
-- Elimina todos los productos y sus referencias, y las operaciones PENDING/FAILED
-- del outbox (huérfanas) para que desaparezca el banner de "operaciones pendientes".
--
-- Uso: sqlite3 prisma/crm_template.db < sql/cleanup_local_catalog.sql
--
-- PRECAUCION: hace un backup del archivo antes de borrar.

PRAGMA foreign_keys = ON;

BEGIN;

-- Referencias directas de producto (en este catalogo: Tomate=7 y Huevo=8)
DELETE FROM PurchaseItem;                          -- items de compra (bloquean el borrado)
DELETE FROM RecipeItem;                            -- recetas
DELETE FROM ProductModifierOption;
DELETE FROM ProductModifierGroup;
DELETE FROM ProductBranchStock;                    -- stock por sucursal
DELETE FROM StockTransferItem;
DELETE FROM ConsignmentItem;
DELETE FROM PromotionCondition;
DELETE FROM ComboItem;
DELETE FROM WebOrderItem;
DELETE FROM SaleItem;
DELETE FROM RecipeCostHistory;

-- Compras/ventas encabezado que quedaron sin items (si estan vacios)
DELETE FROM Purchase WHERE id NOT IN (SELECT DISTINCT purchaseId FROM PurchaseItem)
  AND id NOT IN (SELECT DISTINCT webOrderId FROM WebOrderItem WHERE webOrderId IS NOT NULL);
DELETE FROM Sale WHERE id NOT IN (SELECT DISTINCT saleId FROM SaleItem);

-- Productos (catalogo 100% vacio)
DELETE FROM Product WHERE isIngredient = 1 OR isRecipe = 1 OR 1 = 1;

-- Limpiar operaciones pendientes/pasadas que no se pueden sincronizar
-- (productos que ya no existen ni en local ni en la nube).
DELETE FROM SyncOutbox WHERE status IN ('PENDING', 'FAILED');

COMMIT;

-- Verificacion
SELECT 'Productos restantes: ' || COUNT(*) AS check_product FROM Product;
SELECT 'PENDING restantes: ' || COUNT(*) AS check_pending FROM SyncOutbox WHERE status='PENDING';
SELECT 'FAILED restantes: ' || COUNT(*) AS check_failed FROM SyncOutbox WHERE status='FAILED';