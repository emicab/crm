import { PrismaClient } from '@prisma/client';
import path from 'path';
import {
  getActiveProfile,
  getProfileById,
  listProfiles,
  resolveDbFile,
  getDefaultDbFileName,
} from './profiles';

// Asegurar que DATABASE_URL esté definida antes de instanciar PrismaClient.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;
}

// Clientes cacheados a nivel proceso (sobreviven el hot-reload de Next en dev).
const g = globalThis as any;
if (!g.__clinposClients) {
  g.__clinposClients = { defaultClient: null, clients: new Map<string, PrismaClient>() };
}
const clientCache: { defaultClient: PrismaClient | null; clients: Map<string, PrismaClient> } =
  g.__clinposClients;

function getDefaultClient(): PrismaClient {
  if (!clientCache.defaultClient) {
    clientCache.defaultClient = new PrismaClient();
  }
  return clientCache.defaultClient;
}

function isDefaultDb(dbFile: string): boolean {
  return dbFile === getDefaultDbFileName();
}

function clientForProfileDbFile(dbFile: string | null): PrismaClient {
  if (!dbFile || isDefaultDb(dbFile)) return getDefaultClient();
  let client = clientCache.clients.get(dbFile);
  if (!client) {
    const abs = resolveDbFile(dbFile).replace(/\\/g, '/');
    client = new PrismaClient({ datasourceUrl: `file:${abs}` });
    clientCache.clients.set(dbFile, client);
  }
  return client;
}

// Cache del perfil activo (se invalida explícitamente al crear/activar/borrar).
let cachedActiveDbFile: string | null | undefined = undefined;

export function resetProfileCache(): void {
  cachedActiveDbFile = undefined;
}

function getActiveDbFile(): string | null {
  if (cachedActiveDbFile !== undefined) return cachedActiveDbFile;
  const active = getActiveProfile();
  cachedActiveDbFile = active?.dbFile ?? null;
  return cachedActiveDbFile;
}

export function getActiveClient(): PrismaClient {
  return clientForProfileDbFile(getActiveDbFile());
}

export async function getClientByProfileId(profileId: string | null): Promise<PrismaClient | null> {
  if (!profileId) return getDefaultClient();
  const p = getProfileById(profileId);
  if (!p) return null;
  return clientForProfileDbFile(p.dbFile);
}

// Resuelve el cliente del negocio cuyo StoreConfig.slug coincide (para las rutas
// públicas que consumen ClinStore: catálogo, store-config y creación de pedidos).
export async function findClientBySlug(slug: string): Promise<PrismaClient | null> {
  const clean = (slug || '').trim().toLowerCase();
  if (!clean) return null;

  const seen = new Set<string>();
  const candidates: PrismaClient[] = [getDefaultClient()];
  for (const p of listProfiles()) {
    if (!p.dbFile || isDefaultDb(p.dbFile)) continue;
    if (seen.has(p.dbFile)) continue;
    seen.add(p.dbFile);
    candidates.push(clientForProfileDbFile(p.dbFile));
  }

  for (const client of candidates) {
    try {
      const cfg = await (client as any).storeConfig.findFirst({ where: { slug: clean } });
      if (cfg) return client;
    } catch {
      // ignorar errores (p. ej. DB sin tabla storeConfig todavía)
    }
  }
  return null;
}

function bindFn(client: PrismaClient, value: any): any {
  if (typeof value === 'function') return value.bind(client);
  return value;
}

// Proxy: resuelve el cliente del negocio activo en cada acceso. De esta forma
// las ~90 rutas de API y helpers que importan `prisma` apuntan automáticamente
// al negocio seleccionado sin cambios.
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === 'then') return undefined; // evita ser tratado como thenable
    const client = getActiveClient();
    const value = (client as any)[prop];
    return bindFn(client, value);
  },
  set(_target, prop, value) {
    const client = getActiveClient();
    (client as any)[prop] = value;
    return true;
  },
  has(_target, prop) {
    const client = getActiveClient();
    return prop in (client as any);
  },
  ownKeys() {
    const client = getActiveClient();
    return Reflect.ownKeys(client as any);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = getActiveClient();
    const desc = Object.getOwnPropertyDescriptor(client as any, prop);
    if (desc) {
      desc.value = bindFn(client, desc.value);
    }
    return desc;
  },
}) as PrismaClient;

export default prismaProxy;
