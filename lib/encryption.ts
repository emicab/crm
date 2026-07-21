import crypto from "crypto";
import { machineIdSync } from "node-machine-id";

const ALGORITHM = "aes-256-gcm";

/**
 * Genera una clave Maestra de 256 bits derivada de la identidad física de la máquina (Hardware ID)
 * y la cuenta de usuario del sistema operativo (DPAPI pattern / Hardware Binding).
 */
function getMasterKey(): Buffer {
  let uniqueHardwareId = "";
  try {
    uniqueHardwareId = machineIdSync(true);
  } catch {
    uniqueHardwareId =
      process.env.COMPUTERNAME ||
      process.env.HOSTNAME ||
      "ClinPOS-Fallback-Device-ID";
  }

  const osUser = process.env.USERNAME || process.env.USER || "default_user";
  const rawSeed = `ClinPOS_HW::${uniqueHardwareId}::USER::${osUser}`;

  return crypto.scryptSync(rawSeed, "clinpos_hardware_salt_v2", 32);
}

/**
 * Encripta un texto sensible (ej: clave privada ARCA) usando AES-256-GCM
 * con una clave derivada del hardware único de este equipo.
 * Retorna formato: "ENC::iv.authTag.ciphertext"
 */
export function encryptText(text: string): string {
  if (!text) return "";
  if (text.startsWith("ENC::")) return text; // Ya está encriptado

  const iv = crypto.randomBytes(12);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Usamos el punto '.' como separador seguro (libre de colisiones Hex)
  return `ENC::${iv.toString("hex")}.${authTag}.${encrypted}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM.
 * Si el archivo .db fue copiado a otra computadora con diferente Hardware ID,
 * el descifrado fallará de forma segura.
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("ENC::")) return encryptedText;

  const rawData = encryptedText.substring(5);
  // Soportar tanto '.' como ':' como delimitador para retrocompatibilidad
  const delimiter = rawData.includes(".") ? "." : ":";
  const parts = rawData.split(delimiter);

  if (parts.length !== 3) return encryptedText;

  const [ivHex, authTagHex, cipherHex] = parts;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // Si la clave no coincide (ej. migración de DB entre hardware o salt anterior), probar fallback estático
    try {
      const fallbackKey = crypto.scryptSync(
        "ClinPOS-ARCA-Secure-Key-2026",
        "clinpos_salt_v1",
        32
      );
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = crypto.createDecipheriv(ALGORITHM, fallbackKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch {
      console.warn("⚠️ No se pudo desencriptar la clave con la identidad de esta máquina.");
      return encryptedText;
    }
  }
}
