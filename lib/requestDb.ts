// lib/requestDb.ts
// Resuelve el cliente Prisma a usar según el negocio solicitado (por slug o
// header x-store-slug). Para las rutas públicas que consume ClinStore. Si no
// viene slug, se usa el negocio activo (comportamiento legacy).
import type { NextApiRequest } from 'next';
import type { PrismaClient } from '@prisma/client';
import prisma, { findClientBySlug } from './prisma';

export async function resolveDbForRequest(req: NextApiRequest): Promise<PrismaClient> {
  const slug =
    (req.query.slug ? String(req.query.slug) : '').trim() ||
    (req.headers['x-store-slug'] ? String(req.headers['x-store-slug']) : '').trim();
  if (slug) {
    const client = await findClientBySlug(slug);
    if (client) return client;
  }
  return prisma as unknown as PrismaClient;
}
