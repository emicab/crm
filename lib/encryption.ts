import crypto from "crypto";

const SECRET_SALT = process.env.ENCRYPTION_SECRET || "ClinPOS-ARCA-Secure-Key-2026";
const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  return crypto.scryptSync(SECRET_SALT, "clinpos_salt_v1", 32);
}

/**
 * Encripta un texto sensible (ej: clave privada ARCA) usando AES-256-GCM.
 * Retorna un string formateado como: "ENC::iv:authTag:ciphertext"
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

  return `ENC::${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM.
 * Si el texto no está encriptado, lo retorna tal cual (para mantener retrocompatibilidad).
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("ENC::")) return encryptedText;

  try {
    const parts = encryptedText.substring(5).split(":");
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Error al desencriptar dato:", err);
    return encryptedText;
  }
}
