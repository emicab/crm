// lib/profiles.ts
// Registro de "negocios" (perfiles) + configuración a nivel máquina.
//
// Cada negocio es una base SQLite independiente (carpeta de datos). El archivo
// `store.json` (en la misma carpeta que la DB principal) guarda:
//   - profiles: lista de negocios [{ id, name, businessSector, dbFile }]
//   - activeProfileId: negocio activo en esta PC
//   - deviceSettings: configuración a nivel máquina (licencia, plan, Supabase)
//
// Sin `store.json` (instalación legacy de un solo negocio) todo funciona como
// antes: `lib/prisma` usa DATABASE_URL y las settings de máquina viven en la DB.
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface BusinessProfile {
  id: string;
  name: string;
  businessSector: string; // GASTRONOMIA | INDUMENTARIA | MINIMARKET | RETAIL_GENERAL
  dbFile: string; // ruta relativa a la carpeta de datos (ej. "crm_template.db")
  createdAt: string;
}

export interface StoreFile {
  version: number;
  activeProfileId: string | null;
  profiles: BusinessProfile[];
  deviceSettings: Record<string, string>;
}

// ===== Resolución de la carpeta de datos =====
// Prisma resuelve `file:./foo.db` contra la carpeta del schema (ClinPos/prisma).
// En esta app coincide con process.cwd()/prisma. Para producción/standalone el
// DATABASE_URL lo define el empaquetado (extraResources/crm_template.db).
export function getDataDir(): string {
  const url = (process.env.DATABASE_URL || "").trim();
  const match = url.match(/^file:(.*)$/i);
  if (match) {
    let p = match[1];
    if (p.startsWith("//")) p = p.slice(2); // file:///C:/... o file://relative
    if (!path.isAbsolute(p)) {
      p = path.join(process.cwd(), "prisma", p);
    }
    return path.dirname(path.resolve(p));
  }
  return path.join(process.cwd(), "prisma");
}

export function getStorePath(): string {
  return path.join(getDataDir(), "store.json");
}

export function hasStore(): boolean {
  try {
    return fs.existsSync(getStorePath());
  } catch {
    return false;
  }
}

function emptyStore(): StoreFile {
  return { version: 1, activeProfileId: null, profiles: [], deviceSettings: {} };
}

export function readStore(): StoreFile {
  try {
    const raw = fs.readFileSync(getStorePath(), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 1,
      activeProfileId: typeof parsed.activeProfileId === "string" ? parsed.activeProfileId : null,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      deviceSettings:
        parsed.deviceSettings && typeof parsed.deviceSettings === "object"
          ? parsed.deviceSettings
          : {},
    };
  } catch {
    return emptyStore();
  }
}

export function writeStore(store: StoreFile): void {
  const dir = getDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
  const target = getStorePath();
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  fs.renameSync(tmp, target);
}

// ===== Perfiles =====

export function listProfiles(): BusinessProfile[] {
  return readStore().profiles;
}

export function getProfileById(id: string): BusinessProfile | null {
  return readStore().profiles.find((p) => p.id === id) ?? null;
}

export function getActiveProfile(): BusinessProfile | null {
  const store = readStore();
  if (!store.activeProfileId) return null;
  return store.profiles.find((p) => p.id === store.activeProfileId) ?? null;
}

export function setActiveProfile(id: string | null): void {
  const store = readStore();
  if (id && !store.profiles.some((p) => p.id === id)) {
    throw new Error("El negocio seleccionado no existe.");
  }
  store.activeProfileId = id;
  writeStore(store);
}

export function isMultiBusiness(): boolean {
  return readStore().profiles.length > 1;
}

// Ruta absoluta del archivo DB de un perfil (null para el perfil legacy/default).
export function resolveDbFile(dbFile: string): string {
  if (path.isAbsolute(dbFile)) return dbFile;
  return path.join(getDataDir(), dbFile);
}

// Archivo DB de la conexión por defecto (DATABASE_URL), relativo a la carpeta
// de datos. Sirve para detectar si un perfil apunta a la DB "default" (legacy).
export function getDefaultDbFileName(): string {
  const url = (process.env.DATABASE_URL || "").trim();
  const match = url.match(/^file:(.*)$/i);
  if (match) {
    let p = match[1];
    if (p.startsWith("//")) p = p.slice(2);
    if (path.isAbsolute(p)) return path.basename(p);
    return p.replace(/\\/g, "/").replace(/^\.\//, "");
  }
  return "dev.db";
}

export function createProfile(input: {
  name: string;
  businessSector: string;
  dbFile: string;
  id?: string;
}): BusinessProfile {
  const store = readStore();
  const id = input.id || `b${crypto.randomBytes(5).toString("hex")}`;
  const profile: BusinessProfile = {
    id,
    name: input.name,
    businessSector: input.businessSector || "RETAIL_GENERAL",
    dbFile: input.dbFile,
    createdAt: new Date().toISOString(),
  };
  store.profiles.push(profile);
  writeStore(store);
  return profile;
}

export function deleteProfile(id: string): void {
  const store = readStore();
  store.profiles = store.profiles.filter((p) => p.id !== id);
  if (store.activeProfileId === id) {
    store.activeProfileId = store.profiles[0]?.id ?? null;
  }
  writeStore(store);
}

export function updateProfileName(id: string, name: string, businessSector?: string): void {
  const store = readStore();
  const p = store.profiles.find((x) => x.id === id);
  if (!p) return;
  p.name = name;
  if (businessSector) p.businessSector = businessSector;
  writeStore(store);
}

// ===== Settings a nivel máquina =====

export function getDeviceSettings(): Record<string, string> {
  return readStore().deviceSettings;
}

export function getDeviceSetting(key: string): string | null {
  const v = readStore().deviceSettings[key];
  return v === undefined ? null : v;
}

export function setDeviceSettings(entries: Record<string, string>): void {
  const store = readStore();
  for (const [k, v] of Object.entries(entries)) {
    store.deviceSettings[k] = v;
  }
  writeStore(store);
}
