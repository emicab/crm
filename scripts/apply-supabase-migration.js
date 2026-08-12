// Aplica migraciones SQL pendientes a Supabase usando SUPABASE_DB_URL.
// Uso:
//   1) Agregar al .env: SUPABASE_DB_URL=postgresql://postgres.xxxx:<password>@aws-0-xx.pooler.supabase.com:6543/postgres
//   2) node scripts/apply-supabase-migration.js [archivo.sql ...]
//      (sin argumentos aplica todos los *.sql de sql/ pendientes)
//
// Los scripts usan IF NOT EXISTS / idempotencia, por lo que pueden re-ejecutarse sin riesgo.

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return env;
}

async function main() {
  const env = loadEnv(path.join(__dirname, "..", ".env"));
  const connectionString =
    process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error(
      "Falta SUPABASE_DB_URL en .env. Ejemplo: SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
    );
    process.exit(1);
  }

  let files = process.argv.slice(2);
  if (files.length === 0) {
    files = fs
      .readdirSync(path.join(__dirname, "..", "sql"))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => path.join("sql", f));
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("Conectado a Supabase.");

  for (const file of files) {
    const full = path.resolve(__dirname, "..", file);
    if (!fs.existsSync(full)) {
      console.error(`No existe: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(full, "utf8");
    try {
      await client.query(sql);
      console.log(`✓ Aplicado: ${file}`);
    } catch (err) {
      console.error(`✗ Falló ${file}: ${err.message}`);
    }
  }

  await client.end();
  console.log("Listo. El caché de PostgREST se recarga automáticamente.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
