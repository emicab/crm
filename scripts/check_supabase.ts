import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.setting.findMany();
  let config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  console.log("Local Config:");
  console.log("license_key:", config.license_key);
  console.log("hardware_id:", config.hardware_id);
  
  const storeConfigs = await prisma.storeConfig.findMany();
  const firstStoreConfig = storeConfigs[0];
  console.log("store slug:", firstStoreConfig?.slug);

  const supabaseUrl = config.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = config.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase_anon_key || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  console.log("Supabase URL:", supabaseUrl);

  // Fetch some products to see what tenant_id they have
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/Product?select=id,name,tenant_id&limit=10`, { headers });
    const data = await res.json();
    console.log("Supabase Products:");
    console.log(JSON.stringify(data, null, 2));

    const resB = await fetch(`${supabaseUrl}/rest/v1/Branch?select=id,name,tenant_id&limit=10`, { headers });
    const dataB = await resB.json();
    console.log("Supabase Branches:");
    console.log(JSON.stringify(dataB, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
