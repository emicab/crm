import fs from "fs";
import path from "path";

/**
 * Carga las variables del archivo .env al entorno de ejecución (process.env)
 * en tiempo de ejecución (runtime), tanto en desarrollo como en producción.
 * Si faltan credenciales de Supabase, aplica ÚNICAMENTE la clave pública (anon key)
 * garantizando la seguridad con Row Level Security (RLS).
 */
export function loadEnv() {
  const DEFAULT_ENV: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://htroigemnwqiugieodmv.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cm9pZ2VtbndxaXVnaWVvZG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM4ODcsImV4cCI6MjA5OTI3OTg4N30.sSp5vEDvI7OHuYL0SeeFiATilC_f_BdZao2BjeN0IVQ",
  };

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        
        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    console.error("[EnvLoader] Error al leer archivo .env en runtime:", err);
  }

  // Inyectar únicamente fallbacks públicos de lectura/escritura con RLS si faltan
  Object.entries(DEFAULT_ENV).forEach(([key, val]) => {
    if (!process.env[key]) {
      process.env[key] = val;
    }
  });
}
