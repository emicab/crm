import fs from "fs";
import path from "path";

/**
 * Carga las variables del archivo .env al entorno de ejecución (process.env)
 * en tiempo de ejecución (runtime), tanto en desarrollo como en producción.
 */
export function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        // Ignorar líneas vacías y comentarios
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
}
