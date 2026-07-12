-- DropIndex
DROP INDEX "SaleItem_saleId_productId_key";

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "promotionsApplied" TEXT;

-- CreateTable
CREATE TABLE "Combo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comboId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "customPrice" DECIMAL,
    CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL NOT NULL,
    "minQuantity" INTEGER,
    "maxDiscountQty" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromotionCondition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promotionId" INTEGER NOT NULL,
    "productId" INTEGER,
    "categoryId" INTEGER,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PromotionCondition_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionCondition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromotionCondition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
