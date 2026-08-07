-- Migración: sincronizar esquema de la nube con los cambios locales recientes.
-- Aplicar en el SQL Editor de Supabase. PostgREST refresca el cache de esquema solo.

-- 1) SaleItem: columna "productName" (snapshot del nombre del producto al vender,
--    agregada localmente en la migración v13) + productId opcional (las ventas de
--    productos eliminados conservan el historial por nombre).
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "SaleItem" ALTER COLUMN "productId" DROP NOT NULL;

-- 2) Product: brandId/categoryId opcionales. Los productos elaborados no siempre
--    tienen marca y los ingredientes (materia prima) no tienen categoría ni marca.
ALTER TABLE "Product" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;
