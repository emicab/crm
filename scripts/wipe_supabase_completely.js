const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const os = require('os');

async function wipeSupabaseCompletely() {
  const storeConfigs = await prisma.storeConfig.findMany();
  const firstStoreConfig = storeConfigs[0];
  const config = (await prisma.setting.findMany()).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

  const supabaseUrl = config.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = config.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase_anon_key || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  
  const computerHostname = typeof os.hostname === "function" ? os.hostname() : "pos_local";
  const rawTenant = (
    config.license_key?.trim() ||
    firstStoreConfig?.slug?.trim() ||
    config.businessCuit?.trim() ||
    config.businessName?.trim() ||
    process.env.LICENSE_KEY?.trim() ||
    process.env.HARDWARE_ID?.trim() ||
    `pos_${computerHostname}`
  );

  const tenantId = crypto.createHash("sha256").update(rawTenant).digest("hex").slice(0, 16);
  console.log('--- Limpiando Supabase por completo para tenant:', tenantId, '---');

  const headers = { 
    'apikey': supabaseKey, 
    'Authorization': 'Bearer ' + supabaseKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  // 1. Borrar todas las tablas que referencian a productos o pedidos
  const tables = [
    'WebOrderItem',
    'WebOrder',
    'SaleItem',
    'Sale',
    'PurchaseItem',
    'Purchase',
    'StockTransferItem',
    'StockTransfer',
    'ComboItem',
    'Combo',
    'ConsignmentItem',
    'Consignment',
    'SupplierReturnItem',
    'SupplierReturn',
    'CashMovement',
    'AccountMovement',
    'CashRegister',
    'AccountBalance',
    'Expense',
    'ProductBranchStock',
    'Product',
    'Brand',
    'Category',
    'Supplier',
    'DiscountCode',
    'Promotion',
    'Seller',
    'Branch'
  ];

  for (const table of tables) {
    try {
      // Usar status y verificar borrado
      const url = `${supabaseUrl}/rest/v1/${table}?tenant_id=gt.0`; // borra todo sin importar tenant si service role key
      const urlTenant = `${supabaseUrl}/rest/v1/${table}?tenant_id=eq.${tenantId}`;
      
      const res = await fetch(urlTenant, { method: 'DELETE', headers });
      const text = await res.text().catch(() => '');
      console.log(`Borrando ${table}: HTTP ${res.status} ${text ? text.slice(0, 100) : ''}`);
    } catch (e) {
      console.error(`Error borrando ${table}:`, e.message);
    }
  }

  // Verificar cantidad final de productos en Supabase
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/Product?tenant_id=eq.${tenantId}&select=id`, { headers });
  const remaining = await checkRes.json();
  console.log('--- PRODUCTOS RESTANTES EN SUPABASE:', Array.isArray(remaining) ? remaining.length : remaining, '---');
}

wipeSupabaseCompletely().finally(() => prisma.$disconnect());
