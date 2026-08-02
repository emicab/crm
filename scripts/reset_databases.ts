// scripts/reset_databases.ts
import { PrismaClient } from '@prisma/client';
import { getSelectiveSyncCredentials } from '../lib/syncService';
import * as fs from 'fs';
import * as path from 'path';

async function resetSupabase() {
  console.log('--- 1. Limpiando Supabase ---');
  const { loadEnv } = await import('../lib/envLoader');
  loadEnv();
  const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  // Orden: tablas hijas antes que las padres (evita conflictos de FK)
  const tables = [
    'WebOrderItem', 'WebOrder',
    'SaleItem', 'Sale',
    'PurchaseItem', 'Purchase',
    'ComboItem', 'Combo',
    'CashMovement', 'AccountMovement', 'AccountBalance', 'CashRegister',
    'Expense',
    'ProductBranchStock', 'Product', 'Brand', 'Category', 'Supplier',
    'StockTransferItem', 'StockTransfer',
    'Client', 'Seller', 'User',
    'DiscountCode', 'Promotion',
    'Branch', 'Setting', 'StoreConfig'
  ];

  const failures: string[] = [];
  for (const table of tables) {
    try {
      const url = `${supabaseUrl}/rest/v1/${table}?tenant_id=eq.${encodeURIComponent(tenantId)}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      console.log(`Supabase [${table}]: status ${res.status}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        failures.push(`${table} (HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''})`);
      }
    } catch (e: any) {
      failures.push(`${table} (${e.message})`);
    }
  }

  if (failures.length > 0) {
    console.warn(`[Reset] ATENCION: fallos borrando en Supabase:\n  - ${failures.join('\n  - ')}`);
  }

  try {
    const checkUrl = `${supabaseUrl}/rest/v1/Product?tenant_id=eq.${encodeURIComponent(tenantId)}&select=id&limit=1`;
    const res = await fetch(checkUrl, { headers });
    const remaining = await res.json();
    if (Array.isArray(remaining) && remaining.length > 0) {
      console.warn(`[Reset] ATENCION: aun quedan productos en Supabase para tenant ${tenantId}. Revise permisos/RLS.`);
    } else {
      console.log('[Reset] Supabase verificado: sin productos restantes.');
    }
  } catch (e: any) {
    console.warn('[Reset] No se pudo verificar Supabase:', e.message);
  }
}

function findAllDatabases(): string[] {
  const roots = [process.cwd(), 'C:\\Users\\emica\\Documents\\proyectos\\ProyectoClin\\ClinPos2'];
  const excluded = /node_modules|\.next|\\target|\\dist|\.git/;
  const dbs: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (excluded.test(full)) continue;
        if (e.isDirectory()) {
          stack.push(full);
        } else if (e.isFile() && /^(dev|local2)\.db$/.test(e.name)) {
          dbs.push(full);
        }
      }
    }
  }
  return dbs;
}

async function resetLocalDb(dbPath: string, label: string) {
  console.log(`--- 2. Limpiando Base de Datos Local: ${label} ---`);
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } }
  });

  try {
    const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    const tableNames = tables.map(t => t.name);
    if (!tableNames.includes('Product')) {
      console.log(`[Reset] ${label}: sin schema de productos, se omite.`);
      await prisma.$disconnect();
      return;
    }

    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';"
    );
    const existing = new Set(rows.map(r => r.name));

    const tableList = [
      'WebOrderItem', 'WebOrder', 'SaleItem', 'Sale', 'PurchaseItem', 'Purchase',
      'ComboItem', 'Combo', 'ConsignmentItem', 'Consignment', 'SupplierReturnItem',
      'SupplierReturn', 'StockTransferItem', 'StockTransfer', 'CashMovement',
      'AccountMovement', 'CashRegister', 'AccountBalance', 'Expense',
      'ProductBranchStock', 'Product', 'Brand', 'Category', 'Supplier',
      'DiscountCode', 'Promotion', 'Seller', 'Branch', 'Client'
    ];

    const failures: string[] = [];
    for (const t of tableList) {
      if (!existing.has(t)) continue;
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${t}";`);
        await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = '${t.replace(/'/g, "''")}';`);
      } catch (err: any) {
        failures.push(`${t} (${err.message})`);
      }
    }
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

    await prisma.branch.create({
      data: { id: 1, name: 'Sucursal Principal', isMain: true }
    });

    // Reset a "primer ingreso": limpiar identidad de sucursal/tenant/licencia
    // para que la app vuelva a mostrar el onboarding y a calcular su tenant solo.
    const identityKeys = [
      'license_key', 'hardware_id', 'license_activated_at',
      'tenant_id', 'device_role', 'device_branch_id',
      'app_plan', 'plan_type', 'unlocked_plan_pro', 'storage_mode',
      'businessName', 'businessCuit', 'businessAddress', 'businessPhone',
      'business_profile',
    ];
    await prisma.setting.deleteMany({
      where: { key: { in: identityKeys } }
    });
    await prisma.setting.upsert({
      where: { key: 'business_profile' },
      update: { value: 'unset' },
      create: { key: 'business_profile', value: 'unset' }
    });

    try {
      await prisma.setting.upsert({
        where: { key: 'supabase_last_sync' },
        update: { value: '' },
        create: { key: 'supabase_last_sync', value: '' }
      });
    } catch (err) {}

    const productCount = await prisma.product.count();
    if (productCount !== 0) {
      console.warn(`[Reset] ATENCION: ${label} quedo con ${productCount} productos.`);
    } else {
      console.log(`[Reset] ${label}: 0 productos, Sucursal Principal inicializada.`);
    }
    if (failures.length > 0) {
      console.warn(`[Reset] ATENCION: fallos locales en ${label}:\n  - ${failures.join('\n  - ')}`);
    }
  } catch (err: any) {
    console.error(`[Reset] Error al limpiar ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await resetSupabase();

  const dbFiles = findAllDatabases();
  if (dbFiles.length === 0) {
    console.log('[Reset] No se encontraron bases de datos locales para limpiar.');
    return;
  }
  for (const dbPath of dbFiles) {
    await resetLocalDb(dbPath, dbPath);
  }

  console.log('=== Reset completo realizado con exito ===');
}

main().catch(console.error);
