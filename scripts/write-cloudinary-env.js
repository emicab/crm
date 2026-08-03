// scripts/write-cloudinary-env.js
// Empaqueta SOLO las credenciales de Cloudinary dentro de app_standalone/ para que
// el instalador las incluya y el usuario final no tenga que configurarlas.
// Nunca copia el .env completo (evita exponer SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, etc.).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const outDir = path.join(root, "app_standalone");
const outPath = path.join(outDir, "cloudinary.env");

const KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];

function parseEnv(content) {
  const result = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    if (!KEYS.includes(key)) return;
    result[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  });
  return result;
}

try {
  if (!fs.existsSync(envPath)) {
    console.log("[cloudinary-env] No se encontró .env. Sin credenciales empaquetadas.");
    process.exit(0);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const creds = parseEnv(content);
  const missing = KEYS.filter((k) => !creds[k]);

  if (missing.length > 0) {
    console.warn(`[cloudinary-env] Faltan credenciales en .env: ${missing.join(", ")}`);
  }

  if (Object.keys(creds).length === 0) {
    console.log("[cloudinary-env] No hay credenciales de Cloudinary para empaquetar.");
    if (fs.existsSync(outPath)) fs.rmSync(outPath, { force: true });
    process.exit(0);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const lines = Object.entries(creds).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
  console.log(`[cloudinary-env] Empaquetadas ${lines.length} credenciales en app_standalone/cloudinary.env`);
} catch (err) {
  console.error("[cloudinary-env] Error:", err);
  process.exit(0);
}
