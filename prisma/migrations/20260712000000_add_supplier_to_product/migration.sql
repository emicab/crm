-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "pricePurchase" DECIMAL NOT NULL,
    "priceSale" DECIMAL NOT NULL,
    "quantityStock" INTEGER NOT NULL,
    "stockMinAlert" INTEGER,
    "brandId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brandId", "categoryId", "createdAt", "description", "id", "name", "pricePurchase", "priceSale", "quantityStock", "sku", "stockMinAlert", "updatedAt") SELECT "brandId", "categoryId", "createdAt", "description", "id", "name", "pricePurchase", "priceSale", "quantityStock", "sku", "stockMinAlert", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
