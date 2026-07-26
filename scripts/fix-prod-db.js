/**
 * Script to apply missing schema changes to the production database.
 * Adds: status column to Sale, Invoice table, businessName/cuit to Client.
 */
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(
  process.env.APPDATA,
  'com.emidev.clinpos',
  'crm_prod.db'
);

console.log('Target DB:', dbPath);

// Use prisma to execute raw SQL against the production DB
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${dbPath.replace(/\\/g, '/')}` }
  }
});

async function main() {
  // 1. Check current columns on Sale table
  const saleColumns = await prisma.$queryRawUnsafe(
    `PRAGMA table_info('Sale')`
  );
  const saleColNames = saleColumns.map(c => c.name);
  console.log('Current Sale columns:', saleColNames.join(', '));

  // 2. Add status column to Sale if missing
  if (!saleColNames.includes('status')) {
    console.log('Adding "status" column to Sale...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Sale" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED'`
    );
    console.log('✅ status column added');
  } else {
    console.log('✅ status column already exists');
  }

  // 3. Check if Invoice table exists
  const tables = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='Invoice'`
  );
  if (tables.length === 0) {
    console.log('Creating Invoice table...');
    await prisma.$executeRawUnsafe(`
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
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX "Invoice_saleId_key" ON "Invoice"("saleId")`
    );
    console.log('✅ Invoice table created');
  } else {
    console.log('✅ Invoice table already exists');
  }

  // 4. Check Client columns
  const clientColumns = await prisma.$queryRawUnsafe(
    `PRAGMA table_info('Client')`
  );
  const clientColNames = clientColumns.map(c => c.name);

  if (!clientColNames.includes('businessName')) {
    console.log('Adding "businessName" column to Client...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Client" ADD COLUMN "businessName" TEXT`
    );
    console.log('✅ businessName column added');
  } else {
    console.log('✅ businessName column already exists');
  }

  if (!clientColNames.includes('cuit')) {
    console.log('Adding "cuit" column to Client...');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Client" ADD COLUMN "cuit" TEXT`
    );
    console.log('✅ cuit column added');
  } else {
    console.log('✅ cuit column already exists');
  }

  console.log('\n🎉 Production database updated successfully!');
  console.log('Please restart the ClinPOS app.');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
