-- CreateTable
CREATE TABLE "CashRegister" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "openDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" DATETIME,
    "initialBalance" DECIMAL NOT NULL DEFAULT 0,
    "expectedBalance" DECIMAL,
    "actualBalance" DECIMAL,
    "difference" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cashRegisterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "paymentType" TEXT,
    "sourceId" INTEGER,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
