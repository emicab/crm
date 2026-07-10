-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CashRegister" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "openDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" DATETIME,
    "initialBalance" DECIMAL NOT NULL DEFAULT 0,
    "expectedBalance" DECIMAL,
    "actualBalance" DECIMAL,
    "difference" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "sellerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CashRegister_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CashRegister" ("actualBalance", "closeDate", "createdAt", "difference", "expectedBalance", "id", "initialBalance", "notes", "openDate", "status", "updatedAt") SELECT "actualBalance", "closeDate", "createdAt", "difference", "expectedBalance", "id", "initialBalance", "notes", "openDate", "status", "updatedAt" FROM "CashRegister";
DROP TABLE "CashRegister";
ALTER TABLE "new_CashRegister" RENAME TO "CashRegister";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
