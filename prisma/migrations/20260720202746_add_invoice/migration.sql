-- CreateTable
CREATE TABLE "Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "cae" TEXT NOT NULL,
    "caeExpiration" DATETIME NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "pointOfSale" INTEGER NOT NULL,
    "clientCuit" TEXT,
    "clientName" TEXT,
    "xmlRequest" TEXT,
    "xmlResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_saleId_key" ON "Invoice"("saleId");
