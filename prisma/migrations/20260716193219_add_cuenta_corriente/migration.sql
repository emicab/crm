-- CreateTable
CREATE TABLE "AccountBalance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountBalance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountMovement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountBalanceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "saleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountMovement_accountBalanceId_fkey" FOREIGN KEY ("accountBalanceId") REFERENCES "AccountBalance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL NOT NULL,
    "paymentType" TEXT NOT NULL,
    "notes" TEXT,
    "clientId" INTEGER,
    "sellerId" INTEGER NOT NULL,
    "cashRegisterId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "discountCodeApplied" TEXT,
    "promotionsApplied" TEXT,
    "onAccount" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("cashRegisterId", "clientId", "createdAt", "discountCodeApplied", "id", "notes", "paymentType", "promotionsApplied", "saleDate", "sellerId", "totalAmount", "updatedAt") SELECT "cashRegisterId", "clientId", "createdAt", "discountCodeApplied", "id", "notes", "paymentType", "promotionsApplied", "saleDate", "sellerId", "totalAmount", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalance_clientId_key" ON "AccountBalance"("clientId");
