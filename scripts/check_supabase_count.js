const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const os = require('os');

async function check() {
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
  console.log('Tenant ID:', tenantId);
  console.log('Supabase URL:', supabaseUrl);

  const headers = { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey };
  
  const res = await fetch(`${supabaseUrl}/rest/v1/Product?tenant_id=eq.${tenantId}&select=id,name`, { headers });
  const products = await res.json();
  console.log('Supabase Product count for this tenant:', Array.isArray(products) ? products.length : products);
  if (Array.isArray(products) && products.length > 0) {
    console.log('Sample products:', products.slice(0, 3));
  }

  // Also check without tenant filter just in case
  const resAll = await fetch(`${supabaseUrl}/rest/v1/Product?select=id,name,tenant_id`, { headers });
  const allProds = await resAll.json();
  console.log('TOTAL Products in Supabase (all tenants):', Array.isArray(allProds) ? allProds.length : allProds);
  if (Array.isArray(allProds) && allProds.length > 0) {
    console.log('Sample all prods:', allProds.slice(0, 5));
  }
}
check().finally(() => prisma.$disconnect());
